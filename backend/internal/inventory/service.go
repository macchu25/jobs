package inventory

import (
	"fmt"
	"sync"

	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/models"
)

type OnBinUpdateFunc func(bin models.Bin)

type Service struct {
	mu          sync.RWMutex
	db          *database.DB
	bins        map[string]*models.Bin
	order       []string
	onBinUpdate OnBinUpdateFunc
}

func NewService(cfg *config.Config, db *database.DB, onUpdate OnBinUpdateFunc) (*Service, error) {
	s := &Service{
		db:          db,
		bins:        make(map[string]*models.Bin),
		order:       make([]string, 0),
		onBinUpdate: onUpdate,
	}

	// Try loading persistent metadata from DB
	savedMeta, _ := db.LoadBinsMetadata()

	// Default demo quantities per Section 45
	defaultDemos := map[string]int{
		"A01": 12,
		"A02": 7,
		"A03": 3,
		"B01": 20,
		"B02": 9,
		"B03": 0,
	}

	for _, bc := range cfg.PLCMap.Bins {
		qty := 10
		if dQty, ok := defaultDemos[bc.ID]; ok {
			qty = dQty
		}

		b := &models.Bin{
			ID:             bc.ID,
			Name:           bc.Name,
			ProductCode:    bc.ProductCode,
			ProductName:    bc.ProductName,
			Quantity:       qty,
			Capacity:       bc.Capacity,
			SensorActive:   false,
			Busy:           false,
			PusherExtended: false,
		}

		if saved, ok := savedMeta[bc.ID]; ok {
			b.Name = saved.Name
			b.ProductCode = saved.ProductCode
			b.ProductName = saved.ProductName
			b.Quantity = saved.Quantity
			if saved.Capacity > 0 {
				b.Capacity = saved.Capacity
			}
		}

		b.Status = calculateStatus(b.Quantity, b.Capacity)
		s.bins[b.ID] = b
		s.order = append(s.order, b.ID)

		// Persist back
		_ = db.SaveBinMetadata(*b)
	}

	return s, nil
}

func (s *Service) SetOnUpdateHandler(fn OnBinUpdateFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onBinUpdate = fn
}

func calculateStatus(qty, capacity int) string {
	if qty <= 0 {
		return "EMPTY"
	}
	if qty >= capacity {
		return "FULL"
	}
	if qty <= 3 {
		return "LOW"
	}
	return "AVAILABLE"
}

func (s *Service) GetBins() []models.Bin {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Bin, 0, len(s.order))
	for _, id := range s.order {
		if b, ok := s.bins[id]; ok {
			result = append(result, *b)
		}
	}
	return result
}

func (s *Service) GetBin(id string) (*models.Bin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	b, ok := s.bins[id]
	if !ok {
		return nil, fmt.Errorf("bin %s not found", id)
	}
	cp := *b
	return &cp, nil
}

// Increment adds quantity to a bin (e.g. after sorting confirmation).
func (s *Service) Increment(binID string, amount int, reason string) (*models.Bin, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return nil, fmt.Errorf("bin %s not found", binID)
	}

	if b.Quantity+amount > b.Capacity {
		return nil, fmt.Errorf("bin %s cannot exceed capacity (%d)", binID, b.Capacity)
	}

	b.Quantity += amount
	b.Status = calculateStatus(b.Quantity, b.Capacity)

	_ = s.db.SaveBinMetadata(*b)
	_ = s.db.LogInventoryHistory(binID, amount, b.Quantity, reason)

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}

	return &cp, nil
}

// Decrement subtracts quantity from a bin (e.g. after dispensing outfeed sensor confirmation).
func (s *Service) Decrement(binID string, amount int, reason string) (*models.Bin, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return nil, fmt.Errorf("bin %s not found", binID)
	}

	if b.Quantity-amount < 0 {
		return nil, fmt.Errorf("bin %s has insufficient quantity (%d)", binID, b.Quantity)
	}

	b.Quantity -= amount
	b.Status = calculateStatus(b.Quantity, b.Capacity)

	_ = s.db.SaveBinMetadata(*b)
	_ = s.db.LogInventoryHistory(binID, -amount, b.Quantity, reason)

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}

	return &cp, nil
}

// SetQuantity sets absolute quantity (e.g. when synced with PLC register in Real Mode).
func (s *Service) SetQuantity(binID string, qty int, reason string) (*models.Bin, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return nil, fmt.Errorf("bin %s not found", binID)
	}

	diff := qty - b.Quantity
	if diff == 0 {
		return b, nil
	}

	b.Quantity = qty
	b.Status = calculateStatus(b.Quantity, b.Capacity)

	_ = s.db.SaveBinMetadata(*b)
	_ = s.db.LogInventoryHistory(binID, diff, b.Quantity, reason)

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}

	return &cp, nil
}

// SetBinBusy locks or unlocks a bin during an active command.
func (s *Service) SetBinBusy(binID string, busy bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return
	}
	if b.Busy == busy {
		return
	}
	b.Busy = busy

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}
}

// SetBinSensor updates the live presence sensor indicator for a bin.
func (s *Service) SetBinSensor(binID string, active bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return
	}
	if b.SensorActive == active {
		return
	}
	b.SensorActive = active

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}
}

// SetBinPusher updates the live pusher cylinder status for a bin.
func (s *Service) SetBinPusher(binID string, extended bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.bins[binID]
	if !ok {
		return
	}
	if b.PusherExtended == extended {
		return
	}
	b.PusherExtended = extended

	cp := *b
	if s.onBinUpdate != nil {
		go s.onBinUpdate(cp)
	}
}

// FindBinForProduct determines destination bin for a product code.
func (s *Service) FindBinForProduct(productCode string) (*models.Bin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, id := range s.order {
		b := s.bins[id]
		if b.ProductCode == productCode {
			cp := *b
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("no bin configured for product %s", productCode)
}
