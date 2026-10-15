package real

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/models"
	"warehouse-hmi/internal/plc"
	"warehouse-hmi/internal/plc/driver"
)

type RealPLCAdapter struct {
	mu           sync.RWMutex
	cfg          *config.Config
	driver       driver.PLCDriver
	machineSvc   *machine.Service
	invSvc       *inventory.Service
	alarmEng     *alarm.Engine
	cancelPoll   context.CancelFunc
	running      bool
	connected    bool
	lastError    error
}

func NewRealPLCAdapter(
	cfg *config.Config,
	drv driver.PLCDriver,
	m *machine.Service,
	inv *inventory.Service,
	al *alarm.Engine,
) plc.PLCAdapter {
	return &RealPLCAdapter{
		cfg:        cfg,
		driver:     drv,
		machineSvc: m,
		invSvc:     inv,
		alarmEng:   al,
	}
}

func (r *RealPLCAdapter) Connect(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.machineSvc.SetPLCStatus(false, "CONNECTING")
	err := r.driver.Connect(ctx)
	if err != nil {
		r.connected = false
		r.lastError = err
		r.machineSvc.SetPLCStatus(false, "ERROR")
		r.alarmEng.Raise("PLC_DISCONNECTED", "CRITICAL", fmt.Sprintf("Failed to connect to PLC at %s:%d: %v", r.cfg.PLCHost, r.cfg.PLCPort, err), "PLC_DRIVER")
		return err
	}

	r.connected = true
	r.machineSvc.SetPLCStatus(true, "CONNECTED")
	r.alarmEng.Clear("PLC_DISCONNECTED")

	// Start background poll loop
	pollCtx, cancel := context.WithCancel(context.Background())
	r.cancelPoll = cancel
	r.running = true
	go r.pollLoop(pollCtx)

	return nil
}

func (r *RealPLCAdapter) Disconnect() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.running = false
	if r.cancelPoll != nil {
		r.cancelPoll()
		r.cancelPoll = nil
	}

	r.connected = false
	r.machineSvc.SetPLCStatus(false, "DISCONNECTED")
	return r.driver.Close()
}

func (r *RealPLCAdapter) IsConnected() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.connected && r.driver.IsConnected()
}

func (r *RealPLCAdapter) pollLoop(ctx context.Context) {
	interval := time.Duration(r.cfg.PLCPollIntervalMs) * time.Millisecond
	if interval < 50*time.Millisecond {
		interval = 250 * time.Millisecond
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	backoff := 1 * time.Second
	maxBackoff := 10 * time.Second

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !r.driver.IsConnected() {
				// Attempt reconnect with backoff
				r.mu.Lock()
				r.connected = false
				r.machineSvc.SetPLCStatus(false, "RECONNECTING")
				r.alarmEng.Raise("PLC_DISCONNECTED", "CRITICAL", "PLC heartbeat connection lost. Reconnecting...", "PLC_MONITOR")
				r.mu.Unlock()

				time.Sleep(backoff)
				if err := r.driver.Connect(ctx); err != nil {
					backoff *= 2
					if backoff > maxBackoff {
						backoff = maxBackoff
					}
					continue
				}
				backoff = 1 * time.Second
				r.mu.Lock()
				r.connected = true
				r.machineSvc.SetPLCStatus(true, "CONNECTED")
				r.alarmEng.Clear("PLC_DISCONNECTED")
				r.mu.Unlock()
			}

			// Perform cyclic read
			r.readCyclicData(ctx)
		}
	}
}

func (r *RealPLCAdapter) readCyclicData(ctx context.Context) {
	mMap := r.cfg.PLCMap.Machine
	cMap := r.cfg.PLCMap.Conveyor
	sMap := r.cfg.PLCMap.Sensors

	// 1. Read Machine Status
	if autoMode, err := r.readSignalBool(mMap.AutoMode); err == nil {
		if autoMode {
			_ = r.machineSvc.SetMachineMode("AUTO")
		} else {
			_ = r.machineSvc.SetMachineMode("MANUAL")
		}
	}

	if running, err := r.readSignalBool(mMap.Running); err == nil {
		if running {
			r.machineSvc.SetMachineState("RUNNING")
		}
	}

	if estop, err := r.readSignalBool(mMap.EmergencyStop); err == nil {
		r.machineSvc.SetEmergencyStop(estop)
		if estop {
			r.alarmEng.Raise("EMERGENCY_STOP_ACTIVE", "CRITICAL", "Physical E-STOP circuit is active", "HARDWARE_SAFETY")
		} else {
			r.alarmEng.Clear("EMERGENCY_STOP_ACTIVE")
		}
	}

	// 2. Read Conveyor
	if convRun, err := r.readSignalBool(cMap.Running); err == nil {
		r.machineSvc.SetConveyorRunning(convRun)
	}

	// 3. Read Photo-eye Sensors
	if inSens, err := r.readSignalBool(sMap.InputSensor); err == nil {
		r.machineSvc.SetSensor("input_sensor", inSens)
	}
	if outSens, err := r.readSignalBool(sMap.OutputSensor); err == nil {
		r.machineSvc.SetSensor("output_sensor", outSens)
	}

	// 4. Read Bins (Sensors and Quantities)
	for _, bCfg := range r.cfg.PLCMap.Bins {
		if bSens, err := r.readSignalBool(bCfg.Sensor); err == nil {
			r.invSvc.SetBinSensor(bCfg.ID, bSens)
			r.machineSvc.SetSensor("bin_sensor_"+bCfg.ID, bSens)
		}

		if bPusherExt, err := r.readSignalBool(bCfg.PusherExtendedSensor); err == nil {
			r.invSvc.SetBinPusher(bCfg.ID, bPusherExt)
			if bPusherExt {
				r.machineSvc.SetActuator("pusher_"+bCfg.ID, "EXTENDED")
			} else {
				r.machineSvc.SetActuator("pusher_"+bCfg.ID, "RETRACTED")
			}
		}

		if qty, err := r.readSignalUint16(bCfg.Quantity); err == nil {
			_, _ = r.invSvc.SetQuantity(bCfg.ID, int(qty), "PLC Register Sync")
		}
	}
}

func (r *RealPLCAdapter) readSignalBool(sig config.SignalAddress) (bool, error) {
	addr := uint16(sig.Address)
	switch sig.Type {
	case "coil":
		return r.driver.ReadCoil(addr)
	case "discrete_input":
		return r.driver.ReadDiscreteInput(addr)
	default:
		return false, fmt.Errorf("unsupported boolean signal type: %s", sig.Type)
	}
}

func (r *RealPLCAdapter) readSignalUint16(sig config.SignalAddress) (uint16, error) {
	addr := uint16(sig.Address)
	switch sig.Type {
	case "holding_register":
		return r.driver.ReadHoldingRegister(addr)
	case "input_register":
		return r.driver.ReadInputRegister(addr)
	default:
		return 0, fmt.Errorf("unsupported uint16 signal type: %s", sig.Type)
	}
}

func (r *RealPLCAdapter) ReadMachineState(ctx context.Context) (models.MachineStatus, error) {
	return r.machineSvc.GetStatus(), nil
}

func (r *RealPLCAdapter) ReadBins(ctx context.Context) ([]models.Bin, error) {
	return r.invSvc.GetBins(), nil
}

func (r *RealPLCAdapter) ReadSensors(ctx context.Context) ([]models.Sensor, error) {
	return r.machineSvc.GetSensors(), nil
}

func (r *RealPLCAdapter) ReadActuators(ctx context.Context) ([]models.Actuator, error) {
	return r.machineSvc.GetActuators(), nil
}

// CallItem executes the industrial handshake with the PLC.
func (r *RealPLCAdapter) CallItem(ctx context.Context, binID string) error {
	if !r.cfg.EnableRealPLCWrites {
		return fmt.Errorf("REAL PLC WRITE LOCKED: Writes to physical PLC are disabled by configuration")
	}

	if !r.IsConnected() {
		return fmt.Errorf("cannot call item: PLC is disconnected")
	}

	// Find bin config
	var targetBin *config.BinMapConfig
	for i := range r.cfg.PLCMap.Bins {
		if r.cfg.PLCMap.Bins[i].ID == binID {
			targetBin = &r.cfg.PLCMap.Bins[i]
			break
		}
	}
	if targetBin == nil {
		return fmt.Errorf("bin %s not found in PLC map configuration", binID)
	}

	hs := r.cfg.PLCMap.Handshake

	// Step 1: Set bin numeric code into call_bin_code register
	err := r.driver.WriteSingleRegister(uint16(hs.CallBinCode.Address), uint16(targetBin.BinNumericCode))
	if err != nil {
		return fmt.Errorf("failed to write bin numeric code to PLC: %w", err)
	}

	// Step 2: Strobe call_request coil
	err = r.driver.WriteSingleCoil(uint16(hs.CallRequest.Address), true)
	if err != nil {
		return fmt.Errorf("failed to set call request coil: %w", err)
	}

	// Step 3: Wait for PLC ACK (command_busy == true)
	ackTimeout := time.Duration(r.cfg.CommandAckTimeoutMs) * time.Millisecond
	ackDeadline := time.Now().Add(ackTimeout)
	acknowledged := false

	for time.Now().Before(ackDeadline) {
		busy, err := r.readSignalBool(hs.CommandBusy)
		if err == nil && busy {
			acknowledged = true
			break
		}
		time.Sleep(50 * time.Millisecond)
	}

	// Reset strobe coil regardless
	_ = r.driver.WriteSingleCoil(uint16(hs.CallRequest.Address), false)

	if !acknowledged {
		r.alarmEng.Raise("COMMAND_ACK_TIMEOUT", "ERROR", fmt.Sprintf("PLC did not acknowledge call command for bin %s within %v", binID, ackTimeout), "HANDSHAKE")
		return fmt.Errorf("PLC command ACK timeout")
	}

	// Step 4: Wait for PLC Completion (command_done == true or command_error == true)
	execTimeout := time.Duration(r.cfg.CommandExecTimeoutMs) * time.Millisecond
	execDeadline := time.Now().Add(execTimeout)

	for time.Now().Before(execDeadline) {
		isError, err := r.readSignalBool(hs.CommandError)
		if err == nil && isError {
			errCode, _ := r.readSignalUint16(hs.CommandErrorCode)
			r.alarmEng.Raise("PLC_COMMAND_FAULT", "ERROR", fmt.Sprintf("PLC reported command error code %d for bin %s", errCode, binID), "HANDSHAKE")
			return fmt.Errorf("PLC rejected execution with error code %d", errCode)
		}

		done, err := r.readSignalBool(hs.CommandDone)
		if err == nil && done {
			// Successfully completed dispensing cycle in PLC!
			return nil
		}

		time.Sleep(100 * time.Millisecond)
	}

	r.alarmEng.Raise("OUTPUT_SENSOR_TIMEOUT", "ERROR", fmt.Sprintf("Dispense timeout: PLC did not report completion for bin %s within %v", binID, execTimeout), "DISPENSER")
	return fmt.Errorf("PLC command execution timeout (%v)", execTimeout)
}

func (r *RealPLCAdapter) StartConveyor(ctx context.Context) error {
	if !r.cfg.EnableRealPLCWrites {
		return fmt.Errorf("REAL PLC WRITE LOCKED")
	}
	addr := uint16(r.cfg.PLCMap.Conveyor.StartCommand.Address)
	// Pulse start coil
	_ = r.driver.WriteSingleCoil(addr, true)
	time.Sleep(100 * time.Millisecond)
	return r.driver.WriteSingleCoil(addr, false)
}

func (r *RealPLCAdapter) StopConveyor(ctx context.Context) error {
	if !r.cfg.EnableRealPLCWrites {
		return fmt.Errorf("REAL PLC WRITE LOCKED")
	}
	addr := uint16(r.cfg.PLCMap.Conveyor.StopCommand.Address)
	// Pulse stop coil
	_ = r.driver.WriteSingleCoil(addr, true)
	time.Sleep(100 * time.Millisecond)
	return r.driver.WriteSingleCoil(addr, false)
}

func (r *RealPLCAdapter) Push(ctx context.Context, binID string) error {
	if !r.cfg.EnableRealPLCWrites {
		return fmt.Errorf("REAL PLC WRITE LOCKED")
	}
	for _, b := range r.cfg.PLCMap.Bins {
		if b.ID == binID {
			return r.driver.WriteSingleCoil(uint16(b.PusherExtend.Address), true)
		}
	}
	return fmt.Errorf("bin %s not found", binID)
}

func (r *RealPLCAdapter) Retract(ctx context.Context, binID string) error {
	if !r.cfg.EnableRealPLCWrites {
		return fmt.Errorf("REAL PLC WRITE LOCKED")
	}
	for _, b := range r.cfg.PLCMap.Bins {
		if b.ID == binID {
			return r.driver.WriteSingleCoil(uint16(b.PusherRetract.Address), true)
		}
	}
	return fmt.Errorf("bin %s not found", binID)
}

func (r *RealPLCAdapter) ResetAlarm(ctx context.Context) error {
	_, err := r.alarmEng.ResetAllActive()
	return err
}

func (r *RealPLCAdapter) SetAutoMode(ctx context.Context) error {
	log.Printf("[RealPLCAdapter] Request to set AUTO mode on hardware")
	return nil
}

func (r *RealPLCAdapter) SetManualMode(ctx context.Context) error {
	log.Printf("[RealPLCAdapter] Request to set MANUAL mode on hardware")
	return nil
}
