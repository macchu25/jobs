package machine

import (
	"fmt"
	"sync"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/models"
)

type BroadcastFunc func(event string, payload interface{})

type Service struct {
	mu        sync.RWMutex
	cfg       *config.Config
	alarmEng  *alarm.Engine
	broadcast BroadcastFunc

	plcConnected      bool
	plcStatus         string
	mode              string
	machineMode       string
	machineState      string
	conveyorRunning   bool
	emergencyStop     bool
	realWritesEnabled bool

	sensors   map[string]*models.Sensor
	actuators map[string]*models.Actuator
}

func NewService(cfg *config.Config, alarmEng *alarm.Engine, bcast BroadcastFunc) *Service {
	s := &Service{
		cfg:               cfg,
		alarmEng:          alarmEng,
		broadcast:         bcast,
		plcConnected:      false,
		plcStatus:         "DISCONNECTED",
		mode:              cfg.PLCMode,
		machineMode:       "AUTO",
		machineState:      "IDLE",
		conveyorRunning:   false,
		emergencyStop:     false,
		realWritesEnabled: cfg.EnableRealPLCWrites,
		sensors:           make(map[string]*models.Sensor),
		actuators:         make(map[string]*models.Actuator),
	}

	// Initialize basic sensors
	now := time.Now().UTC()
	s.sensors["input_sensor"] = &models.Sensor{ID: "input_sensor", Name: "Infeed Presence Sensor", Active: false, UpdatedAt: now}
	s.sensors["output_sensor"] = &models.Sensor{ID: "output_sensor", Name: "Outfeed Exit Sensor", Active: false, UpdatedAt: now}

	// Initialize basic actuators
	s.actuators["conveyor"] = &models.Actuator{ID: "conveyor", Name: "Main Sorting Conveyor Motor", State: "STOPPED", UpdatedAt: now}

	for _, b := range cfg.PLCMap.Bins {
		s.actuators["pusher_"+b.ID] = &models.Actuator{
			ID:        "pusher_" + b.ID,
			Name:      fmt.Sprintf("Bin %s Pusher Cylinder", b.ID),
			State:     "RETRACTED",
			UpdatedAt: now,
		}
	}

	return s
}

func (s *Service) SetBroadcast(bcast BroadcastFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.broadcast = bcast
}

func (s *Service) GetStatus() models.MachineStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeAlarms := 0
	if s.alarmEng != nil {
		activeAlarms = s.alarmEng.GetActiveCount()
	}

	state := s.machineState
	if s.emergencyStop {
		state = "EMERGENCY STOP"
	} else if activeAlarms > 0 && state == "IDLE" {
		state = "ALARM"
	}

	return models.MachineStatus{
		PLCConnected:      s.plcConnected,
		PLCStatus:         s.plcStatus,
		Mode:              s.mode,
		MachineMode:       s.machineMode,
		MachineState:      state,
		ConveyorRunning:   s.conveyorRunning,
		EmergencyStop:     s.emergencyStop,
		RealWritesEnabled: s.realWritesEnabled,
		ActiveAlarmCount:  activeAlarms,
		LastUpdate:        time.Now().UTC(),
	}
}

func (s *Service) SetPLCStatus(connected bool, status string) {
	s.mu.Lock()
	changed := s.plcConnected != connected || s.plcStatus != status
	s.plcConnected = connected
	s.plcStatus = status
	bcast := s.broadcast
	s.mu.Unlock()

	if changed && bcast != nil {
		bcast("plc_status", map[string]interface{}{
			"connected": connected,
			"status":    status,
		})
		bcast("machine_state", s.GetStatus())
	}
}

func (s *Service) SetMode(mode string) error {
	s.mu.Lock()
	if mode != "simulation" && mode != "real" {
		s.mu.Unlock()
		return fmt.Errorf("invalid mode: %s", mode)
	}
	s.mode = mode
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("mode_changed", map[string]interface{}{"mode": mode})
		bcast("machine_state", s.GetStatus())
	}
	return nil
}

func (s *Service) SetRealWritesEnabled(enabled bool) {
	s.mu.Lock()
	s.realWritesEnabled = enabled
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("machine_state", s.GetStatus())
	}
}

func (s *Service) SetMachineMode(mMode string) error {
	s.mu.Lock()
	if mMode != "AUTO" && mMode != "MANUAL" {
		s.mu.Unlock()
		return fmt.Errorf("invalid machine mode: %s", mMode)
	}
	s.machineMode = mMode
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("machine_state", s.GetStatus())
	}
	return nil
}

func (s *Service) SetMachineState(state string) {
	s.mu.Lock()
	s.machineState = state
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("machine_state", s.GetStatus())
	}
}

func (s *Service) SetConveyorRunning(running bool) {
	s.mu.Lock()
	changed := s.conveyorRunning != running
	s.conveyorRunning = running
	if running {
		s.actuators["conveyor"].State = "RUNNING"
	} else {
		s.actuators["conveyor"].State = "STOPPED"
	}
	s.actuators["conveyor"].UpdatedAt = time.Now().UTC()
	bcast := s.broadcast
	s.mu.Unlock()

	if changed && bcast != nil {
		bcast("conveyor_updated", map[string]interface{}{"running": running})
		bcast("machine_state", s.GetStatus())
	}
}

func (s *Service) SetEmergencyStop(estop bool) {
	s.mu.Lock()
	changed := s.emergencyStop != estop
	s.emergencyStop = estop
	bcast := s.broadcast
	s.mu.Unlock()

	if changed && bcast != nil {
		bcast("machine_state", s.GetStatus())
	}
}

func (s *Service) SetSensor(id string, active bool) {
	s.mu.Lock()
	sens, ok := s.sensors[id]
	if !ok {
		sens = &models.Sensor{ID: id, Name: id}
		s.sensors[id] = sens
	}
	if sens.Active == active {
		s.mu.Unlock()
		return
	}
	sens.Active = active
	sens.UpdatedAt = time.Now().UTC()
	cp := *sens
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("sensor_updated", cp)
	}
}

func (s *Service) SetActuator(id string, state string) {
	s.mu.Lock()
	act, ok := s.actuators[id]
	if !ok {
		act = &models.Actuator{ID: id, Name: id}
		s.actuators[id] = act
	}
	if act.State == state {
		s.mu.Unlock()
		return
	}
	act.State = state
	act.UpdatedAt = time.Now().UTC()
	cp := *act
	bcast := s.broadcast
	s.mu.Unlock()

	if bcast != nil {
		bcast("actuator_updated", cp)
	}
}

func (s *Service) GetSensors() []models.Sensor {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]models.Sensor, 0, len(s.sensors))
	for _, sens := range s.sensors {
		res = append(res, *sens)
	}
	return res
}

func (s *Service) GetActuators() []models.Actuator {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]models.Actuator, 0, len(s.actuators))
	for _, act := range s.actuators {
		res = append(res, *act)
	}
	return res
}

// ValidateInterlock checks whether an operational command is safe to execute.
func (s *Service) ValidateInterlock(isWriteCommand bool, allowedInManual bool) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if !s.plcConnected && s.mode == "real" {
		return fmt.Errorf("PLC is DISCONNECTED. All control commands are disabled")
	}

	if s.emergencyStop {
		return fmt.Errorf("hardware Emergency Stop is active. Operation interlocked")
	}

	if s.mode == "real" && isWriteCommand && !s.realWritesEnabled {
		return fmt.Errorf("REAL PLC WRITE LOCKED: Writes are disabled in configuration for safety")
	}

	if s.machineMode == "MANUAL" && !allowedInManual {
		return fmt.Errorf("machine is in MANUAL mode. Automatic operation disallowed")
	}

	if s.machineMode == "AUTO" && allowedInManual && isWriteCommand {
		// Manual motion commands (push, start conveyor manually) should be blocked if in AUTO
		// Unless it's a general call item command
	}

	return nil
}
