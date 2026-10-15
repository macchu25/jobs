package mock

import (
	"context"
	"fmt"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/models"
	"warehouse-hmi/internal/plc"
	"warehouse-hmi/internal/simulation"
)

type MockPLCAdapter struct {
	simEng     *simulation.Engine
	machineSvc *machine.Service
	invSvc     *inventory.Service
	alarmEng   *alarm.Engine
	connected  bool
}

func NewMockPLCAdapter(sim *simulation.Engine, m *machine.Service, inv *inventory.Service, al *alarm.Engine) plc.PLCAdapter {
	return &MockPLCAdapter{
		simEng:     sim,
		machineSvc: m,
		invSvc:     inv,
		alarmEng:   al,
		connected:  true,
	}
}

func (m *MockPLCAdapter) Connect(ctx context.Context) error {
	m.connected = true
	m.machineSvc.SetPLCStatus(true, "CONNECTED")
	m.alarmEng.Clear("PLC_DISCONNECTED")
	return nil
}

func (m *MockPLCAdapter) Disconnect() error {
	m.connected = false
	m.machineSvc.SetPLCStatus(false, "DISCONNECTED")
	return nil
}

func (m *MockPLCAdapter) IsConnected() bool {
	return m.connected
}

func (m *MockPLCAdapter) ReadMachineState(ctx context.Context) (models.MachineStatus, error) {
	return m.machineSvc.GetStatus(), nil
}

func (m *MockPLCAdapter) ReadBins(ctx context.Context) ([]models.Bin, error) {
	return m.invSvc.GetBins(), nil
}

func (m *MockPLCAdapter) ReadSensors(ctx context.Context) ([]models.Sensor, error) {
	return m.machineSvc.GetSensors(), nil
}

func (m *MockPLCAdapter) ReadActuators(ctx context.Context) ([]models.Actuator, error) {
	return m.machineSvc.GetActuators(), nil
}

func (m *MockPLCAdapter) CallItem(ctx context.Context, binID string) error {
	if !m.connected {
		return fmt.Errorf("mock PLC disconnected")
	}
	return m.simEng.DispenseItem(ctx, binID)
}

func (m *MockPLCAdapter) StartConveyor(ctx context.Context) error {
	m.machineSvc.SetConveyorRunning(true)
	return nil
}

func (m *MockPLCAdapter) StopConveyor(ctx context.Context) error {
	m.machineSvc.SetConveyorRunning(false)
	return nil
}

func (m *MockPLCAdapter) Push(ctx context.Context, binID string) error {
	m.machineSvc.SetActuator("pusher_"+binID, "EXTENDED")
	m.invSvc.SetBinPusher(binID, true)
	return nil
}

func (m *MockPLCAdapter) Retract(ctx context.Context, binID string) error {
	m.machineSvc.SetActuator("pusher_"+binID, "RETRACTED")
	m.invSvc.SetBinPusher(binID, false)
	return nil
}

func (m *MockPLCAdapter) ResetAlarm(ctx context.Context) error {
	_, err := m.alarmEng.ResetAllActive()
	m.simEng.Reset()
	return err
}

func (m *MockPLCAdapter) SetAutoMode(ctx context.Context) error {
	return m.machineSvc.SetMachineMode("AUTO")
}

func (m *MockPLCAdapter) SetManualMode(ctx context.Context) error {
	return m.machineSvc.SetMachineMode("MANUAL")
}
