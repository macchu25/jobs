package plc

import (
	"context"
	"warehouse-hmi/internal/models"
)

// PLCAdapter abstracts communication between the backend and hardware or simulation.
type PLCAdapter interface {
	Connect(ctx context.Context) error
	Disconnect() error
	IsConnected() bool

	ReadMachineState(ctx context.Context) (models.MachineStatus, error)
	ReadBins(ctx context.Context) ([]models.Bin, error)
	ReadSensors(ctx context.Context) ([]models.Sensor, error)
	ReadActuators(ctx context.Context) ([]models.Actuator, error)

	CallItem(ctx context.Context, binID string) error

	StartConveyor(ctx context.Context) error
	StopConveyor(ctx context.Context) error

	Push(ctx context.Context, binID string) error
	Retract(ctx context.Context, binID string) error

	ResetAlarm(ctx context.Context) error

	SetAutoMode(ctx context.Context) error
	SetManualMode(ctx context.Context) error
}
