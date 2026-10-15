package simulation

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
)

type Engine struct {
	mu           sync.Mutex
	cfg          *config.Config
	machineSvc   *machine.Service
	inventorySvc *inventory.Service
	alarmEng     *alarm.Engine

	running          bool
	autoGen          bool
	autoGenCancel    context.CancelFunc
	speedMultiplier  float64
	jammed           bool
	forcedDisconnect bool

	// Item in transit animation status
	activeTransitItem *TransitItem
}

type TransitItem struct {
	ID          string `json:"id"`
	ProductCode string `json:"productCode"`
	TargetBinID string `json:"targetBinId"`
	Stage       string `json:"stage"` // "INPUT", "CONVEYOR", "DIVERTING", "BIN", "DISPENSING", "OUTPUT"
	Progress    int    `json:"progress"` // 0 to 100%
}

func NewEngine(cfg *config.Config, m *machine.Service, inv *inventory.Service, al *alarm.Engine) *Engine {
	speed := cfg.SimulationSpeed
	if speed <= 0 {
		speed = 1.0
	}
	return &Engine{
		cfg:             cfg,
		machineSvc:      m,
		inventorySvc:    inv,
		alarmEng:        al,
		speedMultiplier: speed,
	}
}

func (e *Engine) delay(baseMs int) {
	ms := float64(baseMs) / e.speedMultiplier
	time.Sleep(time.Duration(ms) * time.Millisecond)
}

func (e *Engine) SetSpeed(multiplier float64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if multiplier > 0 {
		e.speedMultiplier = multiplier
	}
}

func (e *Engine) GetTransitItem() *TransitItem {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.activeTransitItem
}

// AddRandomItem simulates generating and sorting a random product package.
func (e *Engine) AddRandomItem() error {
	products := []string{"PRODUCT_A", "PRODUCT_B", "PRODUCT_C", "PRODUCT_D", "PRODUCT_E", "PRODUCT_F"}
	prod := products[rand.Intn(len(products))]
	return e.AddItemByProduct(prod)
}

// AddItemByProduct simulates the full infeed sorting sequence.
func (e *Engine) AddItemByProduct(productCode string) error {
	e.mu.Lock()
	if e.jammed {
		e.mu.Unlock()
		return fmt.Errorf("machine is currently jammed; clear jam before introducing items")
	}
	if e.forcedDisconnect {
		e.mu.Unlock()
		return fmt.Errorf("PLC is disconnected")
	}
	e.mu.Unlock()

	targetBin, err := e.inventorySvc.FindBinForProduct(productCode)
	if err != nil {
		e.alarmEng.Raise("PRODUCT_UNKNOWN", "WARNING", fmt.Sprintf("Scanned barcode %s has no configured bin", productCode), "BARCODE_SCANNER")
		return err
	}

	if targetBin.Quantity >= targetBin.Capacity {
		e.alarmEng.Raise("BIN_FULL", "WARNING", fmt.Sprintf("Target bin %s for product %s is at full capacity (%d)", targetBin.ID, productCode, targetBin.Capacity), "INVENTORY")
		return fmt.Errorf("target bin %s is full", targetBin.ID)
	}

	go e.runSortingSequence(productCode, targetBin.ID)
	return nil
}

func (e *Engine) runSortingSequence(productCode, targetBinID string) {
	e.machineSvc.SetMachineState("SORTING")
	e.machineSvc.SetSensor("input_sensor", true)

	e.mu.Lock()
	e.activeTransitItem = &TransitItem{
		ID:          fmt.Sprintf("ITEM-%d", time.Now().UnixNano()%100000),
		ProductCode: productCode,
		TargetBinID: targetBinID,
		Stage:       "INPUT",
		Progress:    10,
	}
	e.mu.Unlock()

	e.delay(600)

	// Step 2: Conveyor runs and package travels
	e.machineSvc.SetConveyorRunning(true)
	e.machineSvc.SetSensor("input_sensor", false)

	e.mu.Lock()
	if e.activeTransitItem != nil {
		e.activeTransitItem.Stage = "CONVEYOR"
		e.activeTransitItem.Progress = 40
	}
	e.mu.Unlock()

	e.delay(1000)

	// Step 3: Diverting / Pusher extends towards bin
	e.mu.Lock()
	if e.activeTransitItem != nil {
		e.activeTransitItem.Stage = "DIVERTING"
		e.activeTransitItem.Progress = 70
	}
	e.mu.Unlock()

	e.machineSvc.SetActuator("pusher_"+targetBinID, "EXTENDED")
	e.inventorySvc.SetBinPusher(targetBinID, true)
	e.delay(600)

	// Step 4: Bin sensor triggers, item deposited
	e.machineSvc.SetSensor("bin_sensor_"+targetBinID, true)
	e.inventorySvc.SetBinSensor(targetBinID, true)

	e.mu.Lock()
	if e.activeTransitItem != nil {
		e.activeTransitItem.Stage = "BIN"
		e.activeTransitItem.Progress = 100
	}
	e.mu.Unlock()

	e.delay(500)

	// Step 5: Inventory incremented
	_, _ = e.inventorySvc.Increment(targetBinID, 1, fmt.Sprintf("Sorted %s into %s", productCode, targetBinID))

	// Step 6: Pusher retracts, sensor clears
	e.machineSvc.SetActuator("pusher_"+targetBinID, "RETRACTED")
	e.inventorySvc.SetBinPusher(targetBinID, false)
	e.delay(400)

	e.machineSvc.SetSensor("bin_sensor_"+targetBinID, false)
	e.inventorySvc.SetBinSensor(targetBinID, false)
	e.machineSvc.SetConveyorRunning(false)
	e.machineSvc.SetMachineState("IDLE")

	e.mu.Lock()
	e.activeTransitItem = nil
	e.mu.Unlock()
}

// DispenseItem simulates the sequence when an operator calls an item from a bin.
func (e *Engine) DispenseItem(ctx context.Context, binID string) error {
	bin, err := e.inventorySvc.GetBin(binID)
	if err != nil {
		return err
	}
	if bin.Quantity <= 0 {
		return fmt.Errorf("bin %s is empty", binID)
	}

	e.machineSvc.SetMachineState("DISPENSING")
	e.inventorySvc.SetBinBusy(binID, true)
	defer e.inventorySvc.SetBinBusy(binID, false)

	e.mu.Lock()
	e.activeTransitItem = &TransitItem{
		ID:          fmt.Sprintf("DISP-%d", time.Now().UnixNano()%100000),
		ProductCode: bin.ProductCode,
		TargetBinID: binID,
		Stage:       "DISPENSING",
		Progress:    20,
	}
	e.mu.Unlock()

	// Step 1: Conveyor starts
	e.machineSvc.SetConveyorRunning(true)
	e.delay(400)

	// Step 2: Pusher extends pushing item out of bin onto discharge conveyor
	e.machineSvc.SetActuator("pusher_"+binID, "EXTENDED")
	e.inventorySvc.SetBinPusher(binID, true)
	e.delay(700)

	e.machineSvc.SetActuator("pusher_"+binID, "RETRACTED")
	e.inventorySvc.SetBinPusher(binID, false)

	e.mu.Lock()
	if e.activeTransitItem != nil {
		e.activeTransitItem.Stage = "OUTPUT"
		e.activeTransitItem.Progress = 70
	}
	e.mu.Unlock()

	e.delay(800)

	// Step 3: Outfeed sensor confirms exit
	e.machineSvc.SetSensor("output_sensor", true)
	e.delay(500)

	// Confirmation -> Decrement inventory
	_, err = e.inventorySvc.Decrement(binID, 1, fmt.Sprintf("Dispensed from %s", binID))
	if err != nil {
		e.alarmEng.Raise("OUTPUT_SENSOR_TIMEOUT", "ERROR", fmt.Sprintf("Failed to decrement inventory for %s: %v", binID, err), "DISPENSER")
	}

	e.machineSvc.SetSensor("output_sensor", false)
	e.delay(300)

	e.machineSvc.SetConveyorRunning(false)
	e.machineSvc.SetMachineState("IDLE")

	e.mu.Lock()
	e.activeTransitItem = nil
	e.mu.Unlock()

	return err
}

// StartAutoGeneration spawns items periodically.
func (e *Engine) StartAutoGeneration(interval time.Duration) {
	e.mu.Lock()
	if e.autoGen {
		e.mu.Unlock()
		return
	}
	e.autoGen = true
	ctx, cancel := context.WithCancel(context.Background())
	e.autoGenCancel = cancel
	e.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = e.AddRandomItem()
			}
		}
	}()
}

// StopAutoGeneration terminates periodic generation.
func (e *Engine) StopAutoGeneration() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.autoGen && e.autoGenCancel != nil {
		e.autoGenCancel()
		e.autoGen = false
	}
}

func (e *Engine) IsAutoGenerating() bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.autoGen
}

// TriggerJam simulates a physical conveyor package jam.
func (e *Engine) TriggerJam() {
	e.mu.Lock()
	e.jammed = true
	e.mu.Unlock()

	e.machineSvc.SetConveyorRunning(false)
	e.machineSvc.SetMachineState("ALARM")
	e.alarmEng.Raise("ITEM_JAM", "ERROR", "Optical sensor timeout: package jammed along main conveyor section", "CONVEYOR_SYSTEM")
}

// SimulateDisconnect simulates losing communication with the PLC.
func (e *Engine) SimulateDisconnect(duration time.Duration) {
	e.mu.Lock()
	e.forcedDisconnect = true
	e.mu.Unlock()

	e.machineSvc.SetPLCStatus(false, "DISCONNECTED")
	e.alarmEng.Raise("PLC_DISCONNECTED", "CRITICAL", "Lost heartbeat connection with programmable logic controller", "PLC_COMM")

	if duration > 0 {
		go func() {
			time.Sleep(duration)
			e.mu.Lock()
			e.forcedDisconnect = false
			e.mu.Unlock()

			e.machineSvc.SetPLCStatus(true, "CONNECTED")
			e.alarmEng.Clear("PLC_DISCONNECTED")
		}()
	}
}

// Reset clears simulated faults and sets machine to idle.
func (e *Engine) Reset() {
	e.mu.Lock()
	e.jammed = false
	e.forcedDisconnect = false
	e.activeTransitItem = nil
	e.mu.Unlock()

	e.machineSvc.SetConveyorRunning(false)
	e.machineSvc.SetMachineState("IDLE")
	e.machineSvc.SetSensor("input_sensor", false)
	e.machineSvc.SetSensor("output_sensor", false)
	e.machineSvc.SetPLCStatus(true, "CONNECTED")
	e.alarmEng.Clear("ITEM_JAM")
	e.alarmEng.Clear("PLC_DISCONNECTED")
}
