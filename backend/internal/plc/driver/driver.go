package driver

import (
	"context"
)

// PLCDriver abstracts low-level fieldbus and Ethernet industrial communication protocols.
type PLCDriver interface {
	Connect(ctx context.Context) error
	Close() error
	IsConnected() bool

	ReadCoil(address uint16) (bool, error)
	ReadDiscreteInput(address uint16) (bool, error)
	ReadHoldingRegister(address uint16) (uint16, error)
	ReadInputRegister(address uint16) (uint16, error)

	ReadCoils(address uint16, quantity uint16) ([]bool, error)
	ReadDiscreteInputs(address uint16, quantity uint16) ([]bool, error)
	ReadHoldingRegisters(address uint16, quantity uint16) ([]uint16, error)

	WriteSingleCoil(address uint16, value bool) error
	WriteSingleRegister(address uint16, value uint16) error
}
