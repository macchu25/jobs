package command

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/models"
	"warehouse-hmi/internal/plc"
)

type BroadcastFunc func(event string, payload interface{})

type Engine struct {
	mu         sync.Mutex
	db         *database.DB
	adapter    plc.PLCAdapter
	machineSvc *machine.Service
	invSvc     *inventory.Service
	alarmEng   *alarm.Engine
	broadcast  BroadcastFunc
	activeCmds map[string]*models.Command
}

func NewEngine(
	db *database.DB,
	adapter plc.PLCAdapter,
	m *machine.Service,
	inv *inventory.Service,
	al *alarm.Engine,
	bcast BroadcastFunc,
) *Engine {
	return &Engine{
		db:         db,
		adapter:    adapter,
		machineSvc: m,
		invSvc:     inv,
		alarmEng:   al,
		broadcast:  bcast,
		activeCmds: make(map[string]*models.Command),
	}
}

func (e *Engine) SetAdapter(adapter plc.PLCAdapter) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.adapter = adapter
}

func (e *Engine) SetBroadcast(bcast BroadcastFunc) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.broadcast = bcast
}

func (e *Engine) GetActiveCommands() []models.Command {
	e.mu.Lock()
	defer e.mu.Unlock()

	res := make([]models.Command, 0, len(e.activeCmds))
	for _, cmd := range e.activeCmds {
		res = append(res, *cmd)
	}
	return res
}

// CallItem executes a coordinated call item request through validation and adapter.
func (e *Engine) CallItem(ctx context.Context, binID, user, ip string) (*models.Command, error) {
	e.mu.Lock()

	// 1. Interlock Validation
	if err := e.machineSvc.ValidateInterlock(true, false); err != nil {
		e.mu.Unlock()
		_ = e.db.LogAudit(user, ip, "CALL_ITEM", binID, "", "FAILED_INTERLOCK")
		return nil, fmt.Errorf("interlock violation: %w", err)
	}

	// 2. Bin Validation
	bin, err := e.invSvc.GetBin(binID)
	if err != nil {
		e.mu.Unlock()
		return nil, err
	}

	if bin.Busy {
		e.mu.Unlock()
		return nil, fmt.Errorf("BIN_BUSY: bin %s is currently executing an operation", binID)
	}

	if bin.Quantity <= 0 {
		e.mu.Unlock()
		return nil, fmt.Errorf("BIN_EMPTY: bin %s has 0 items", binID)
	}

	now := time.Now().UTC()
	cmd := &models.Command{
		ID:        uuid.New().String(),
		Type:      "CALL_ITEM",
		BinID:     binID,
		Status:    "PENDING",
		CreatedAt: now,
	}

	e.activeCmds[cmd.ID] = cmd
	e.invSvc.SetBinBusy(binID, true)
	e.mu.Unlock()

	_ = e.db.SaveCommand(*cmd)
	_ = e.db.LogAudit(user, ip, "CALL_ITEM", binID, fmt.Sprintf("qty_before=%d", bin.Quantity), "ACCEPTED")
	e.notify("command_created", *cmd)

	// Execute asynchronously
	go e.runCallItem(cmd, binID)

	return cmd, nil
}

func (e *Engine) runCallItem(cmd *models.Command, binID string) {
	defer func() {
		e.invSvc.SetBinBusy(binID, false)
		e.mu.Lock()
		delete(e.activeCmds, cmd.ID)
		e.mu.Unlock()
	}()

	// Transition to RUNNING
	now := time.Now().UTC()
	cmd.Status = "RUNNING"
	cmd.StartedAt = &now
	_ = e.db.SaveCommand(*cmd)
	e.notify("command_updated", *cmd)

	// Execute through adapter
	adapter := e.getAdapter()
	err := adapter.CallItem(context.Background(), binID)

	completedAt := time.Now().UTC()
	cmd.CompletedAt = &completedAt

	if err != nil {
		cmd.Status = "FAILED"
		cmd.ErrorCode = "DISPENSE_FAILED"
		cmd.ErrorMessage = err.Error()
		_ = e.db.SaveCommand(*cmd)
		_ = e.db.LogEvent(models.Event{
			EventType:   "CALL_ITEM",
			Source:      "COMMAND_ENGINE",
			BinID:       binID,
			Description: fmt.Sprintf("Call item %s failed: %v", binID, err),
			CommandID:   cmd.ID,
			Result:      "FAILED",
		})
		e.notify("command_failed", *cmd)
		return
	}

	cmd.Status = "COMPLETED"
	_ = e.db.SaveCommand(*cmd)
	_ = e.db.LogEvent(models.Event{
		EventType:   "CALL_ITEM",
		Source:      "COMMAND_ENGINE",
		BinID:       binID,
		Description: fmt.Sprintf("Successfully dispensed item from bin %s", binID),
		CommandID:   cmd.ID,
		Result:      "COMPLETED",
	})
	e.notify("command_completed", *cmd)
}

func (e *Engine) getAdapter() plc.PLCAdapter {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.adapter
}

func (e *Engine) notify(event string, payload interface{}) {
	e.mu.Lock()
	bcast := e.broadcast
	e.mu.Unlock()
	if bcast != nil {
		bcast(event, payload)
	}
}

// StartConveyor sends manual or automatic start command.
func (e *Engine) StartConveyor(ctx context.Context, user, ip string) error {
	if err := e.machineSvc.ValidateInterlock(true, true); err != nil {
		return err
	}
	adapter := e.getAdapter()
	err := adapter.StartConveyor(ctx)
	_ = e.db.LogAudit(user, ip, "START_CONVEYOR", "CONVEYOR", "", fmt.Sprintf("err=%v", err))
	return err
}

// StopConveyor sends manual or automatic stop command.
func (e *Engine) StopConveyor(ctx context.Context, user, ip string) error {
	if err := e.machineSvc.ValidateInterlock(true, true); err != nil {
		return err
	}
	adapter := e.getAdapter()
	err := adapter.StopConveyor(ctx)
	_ = e.db.LogAudit(user, ip, "STOP_CONVEYOR", "CONVEYOR", "", fmt.Sprintf("err=%v", err))
	return err
}

// ManualPush triggers pusher extension in manual mode.
func (e *Engine) ManualPush(ctx context.Context, binID, user, ip string) error {
	status := e.machineSvc.GetStatus()
	if status.MachineMode != "MANUAL" {
		return fmt.Errorf("manual commands require machine mode = MANUAL")
	}
	if err := e.machineSvc.ValidateInterlock(true, true); err != nil {
		return err
	}
	adapter := e.getAdapter()
	err := adapter.Push(ctx, binID)
	_ = e.db.LogAudit(user, ip, "MANUAL_PUSH", binID, "", fmt.Sprintf("err=%v", err))
	return err
}

// ManualRetract triggers pusher retraction in manual mode.
func (e *Engine) ManualRetract(ctx context.Context, binID, user, ip string) error {
	status := e.machineSvc.GetStatus()
	if status.MachineMode != "MANUAL" {
		return fmt.Errorf("manual commands require machine mode = MANUAL")
	}
	if err := e.machineSvc.ValidateInterlock(true, true); err != nil {
		return err
	}
	adapter := e.getAdapter()
	err := adapter.Retract(ctx, binID)
	_ = e.db.LogAudit(user, ip, "MANUAL_RETRACT", binID, "", fmt.Sprintf("err=%v", err))
	return err
}
