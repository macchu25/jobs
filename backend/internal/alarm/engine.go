package alarm

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/models"
)

type OnAlarmChangeFunc func(alarm models.Alarm, action string)

type Engine struct {
	mu            sync.RWMutex
	db            *database.DB
	activeAlarms  map[string]*models.Alarm // key = code
	onAlarmChange OnAlarmChangeFunc
}

func NewEngine(db *database.DB, onChange OnAlarmChangeFunc) *Engine {
	e := &Engine{
		db:            db,
		activeAlarms:  make(map[string]*models.Alarm),
		onAlarmChange: onChange,
	}

	// Load existing active alarms from DB if any
	if db != nil {
		alarms, err := db.GetAlarms(true)
		if err == nil {
			for i := range alarms {
				a := alarms[i]
				e.activeAlarms[a.Code] = &a
			}
		}
	}

	return e
}

// SetOnChangeHandler sets or updates the callback for alarm broadcasts.
func (e *Engine) SetOnChangeHandler(fn OnAlarmChangeFunc) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.onAlarmChange = fn
}

// Raise creates or refreshes an active alarm.
func (e *Engine) Raise(code, severity, message, source string) (*models.Alarm, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	existing, found := e.activeAlarms[code]
	if found && existing.Active {
		// Already active, don't duplicate
		return existing, false
	}

	alarm := &models.Alarm{
		ID:           uuid.New().String(),
		Code:         code,
		Severity:     severity,
		Message:      message,
		Source:       source,
		Active:       true,
		Acknowledged: false,
		CreatedAt:    now,
	}

	e.activeAlarms[code] = alarm

	if e.db != nil {
		_ = e.db.SaveAlarm(*alarm)
		_ = e.db.LogEvent(models.Event{
			EventType:   "ALARM_CREATED",
			Source:      source,
			Description: fmt.Sprintf("[%s] %s: %s", severity, code, message),
			Result:      "ACTIVE",
		})
	}

	if e.onAlarmChange != nil {
		go e.onAlarmChange(*alarm, "alarm_created")
	}

	return alarm, true
}

// Acknowledge marks an active alarm as acknowledged.
func (e *Engine) Acknowledge(id string) (*models.Alarm, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	var target *models.Alarm
	for _, a := range e.activeAlarms {
		if a.ID == id {
			target = a
			break
		}
	}

	if target == nil {
		return nil, fmt.Errorf("alarm %s not found or inactive", id)
	}

	target.Acknowledged = true
	target.AcknowledgedAt = &now

	if e.db != nil {
		_ = e.db.SaveAlarm(*target)
		_ = e.db.LogEvent(models.Event{
			EventType:   "ALARM_ACK",
			Source:      target.Source,
			Description: fmt.Sprintf("Alarm %s acknowledged", target.Code),
			Result:      "ACKNOWLEDGED",
		})
	}

	if e.onAlarmChange != nil {
		go e.onAlarmChange(*target, "alarm_updated")
	}

	return target, nil
}

// Clear deactivates an active alarm by code.
func (e *Engine) Clear(code string) (*models.Alarm, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	target, found := e.activeAlarms[code]
	if !found || !target.Active {
		return nil, false
	}

	now := time.Now().UTC()
	target.Active = false
	target.ClearedAt = &now
	delete(e.activeAlarms, code)

	if e.db != nil {
		_ = e.db.SaveAlarm(*target)
		_ = e.db.LogEvent(models.Event{
			EventType:   "ALARM_CLEARED",
			Source:      target.Source,
			Description: fmt.Sprintf("Alarm %s cleared", target.Code),
			Result:      "CLEARED",
		})
	}

	if e.onAlarmChange != nil {
		go e.onAlarmChange(*target, "alarm_cleared")
	}

	return target, true
}

// ClearByID deactivates an active alarm by ID.
func (e *Engine) ClearByID(id string) (*models.Alarm, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	for code, a := range e.activeAlarms {
		if a.ID == id {
			now := time.Now().UTC()
			a.Active = false
			a.ClearedAt = &now
			delete(e.activeAlarms, code)

			if e.db != nil {
				_ = e.db.SaveAlarm(*a)
			}
			if e.onAlarmChange != nil {
				go e.onAlarmChange(*a, "alarm_cleared")
			}
			return a, true
		}
	}
	return nil, false
}

// ResetAllActive clears all active non-critical or acknowledged alarms.
func (e *Engine) ResetAllActive() ([]models.Alarm, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	var cleared []models.Alarm
	now := time.Now().UTC()

	for code, a := range e.activeAlarms {
		a.Active = false
		a.ClearedAt = &now
		if e.db != nil {
			_ = e.db.SaveAlarm(*a)
		}
		cleared = append(cleared, *a)
		delete(e.activeAlarms, code)
	}

	if e.db != nil {
		_ = e.db.LogEvent(models.Event{
			EventType:   "ALARMS_RESET",
			Source:      "OPERATOR",
			Description: fmt.Sprintf("Reset all %d active alarms", len(cleared)),
			Result:      "SUCCESS",
		})
	}

	for _, a := range cleared {
		if e.onAlarmChange != nil {
			go e.onAlarmChange(a, "alarm_cleared")
		}
	}

	return cleared, nil
}

// GetActiveAlarms returns a snapshot of active alarms.
func (e *Engine) GetActiveAlarms() []models.Alarm {
	e.mu.RLock()
	defer e.mu.RUnlock()

	list := make([]models.Alarm, 0, len(e.activeAlarms))
	for _, a := range e.activeAlarms {
		list = append(list, *a)
	}
	return list
}

// GetActiveCount returns the number of currently active alarms.
func (e *Engine) GetActiveCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.activeAlarms)
}
