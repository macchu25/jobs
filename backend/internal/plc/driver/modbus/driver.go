package modbus

import (
	"context"
	"encoding/binary"
	"fmt"
	"sync"
	"time"

	"github.com/goburrow/modbus"
	"warehouse-hmi/internal/plc/driver"
)

type ModbusTCPDriver struct {
	mu        sync.Mutex
	host      string
	port      int
	unitID    byte
	handler   *modbus.TCPClientHandler
	client    modbus.Client
	connected bool
}

func NewModbusTCPDriver(host string, port int, unitID byte) driver.PLCDriver {
	return &ModbusTCPDriver{
		host:   host,
		port:   port,
		unitID: unitID,
	}
}

func (m *ModbusTCPDriver) Connect(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.connected && m.handler != nil {
		return nil
	}

	address := fmt.Sprintf("%s:%d", m.host, m.port)
	handler := modbus.NewTCPClientHandler(address)
	handler.Timeout = 2 * time.Second
	handler.SlaveId = m.unitID

	err := handler.Connect()
	if err != nil {
		m.connected = false
		return fmt.Errorf("modbus tcp connect to %s failed: %w", address, err)
	}

	m.handler = handler
	m.client = modbus.NewClient(handler)
	m.connected = true
	return nil
}

func (m *ModbusTCPDriver) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.connected = false
	if m.handler != nil {
		err := m.handler.Close()
		m.handler = nil
		m.client = nil
		return err
	}
	return nil
}

func (m *ModbusTCPDriver) IsConnected() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connected
}

// normalizeAddress translates 1-indexed (e.g. 10001 or 40001) or direct offsets to 0-indexed Modbus protocol offset
func normalizeAddress(addr uint16) uint16 {
	if addr >= 40001 {
		return addr - 40001
	}
	if addr >= 30001 {
		return addr - 30001
	}
	if addr >= 10001 {
		return addr - 10001
	}
	if addr >= 1 {
		return addr - 1
	}
	return 0
}

func (m *ModbusTCPDriver) ReadCoil(address uint16) (bool, error) {
	bits, err := m.ReadCoils(address, 1)
	if err != nil {
		return false, err
	}
	if len(bits) == 0 {
		return false, fmt.Errorf("empty coil response")
	}
	return bits[0], nil
}

func (m *ModbusTCPDriver) ReadDiscreteInput(address uint16) (bool, error) {
	bits, err := m.ReadDiscreteInputs(address, 1)
	if err != nil {
		return false, err
	}
	if len(bits) == 0 {
		return false, fmt.Errorf("empty discrete input response")
	}
	return bits[0], nil
}

func (m *ModbusTCPDriver) ReadHoldingRegister(address uint16) (uint16, error) {
	words, err := m.ReadHoldingRegisters(address, 1)
	if err != nil {
		return 0, err
	}
	if len(words) == 0 {
		return 0, fmt.Errorf("empty register response")
	}
	return words[0], nil
}

func (m *ModbusTCPDriver) ReadInputRegister(address uint16) (uint16, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return 0, fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	bytes, err := m.client.ReadInputRegisters(offset, 1)
	if err != nil {
		m.connected = false
		return 0, fmt.Errorf("modbus ReadInputRegisters error at %d: %w", address, err)
	}

	if len(bytes) < 2 {
		return 0, fmt.Errorf("insufficient bytes returned")
	}
	return binary.BigEndian.Uint16(bytes[:2]), nil
}

func (m *ModbusTCPDriver) ReadCoils(address uint16, quantity uint16) ([]bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return nil, fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	bytes, err := m.client.ReadCoils(offset, quantity)
	if err != nil {
		m.connected = false
		return nil, fmt.Errorf("modbus ReadCoils error at %d: %w", address, err)
	}

	res := make([]bool, quantity)
	for i := 0; i < int(quantity); i++ {
		byteIndex := i / 8
		bitIndex := i % 8
		if byteIndex < len(bytes) {
			res[i] = (bytes[byteIndex] & (1 << bitIndex)) != 0
		}
	}
	return res, nil
}

func (m *ModbusTCPDriver) ReadDiscreteInputs(address uint16, quantity uint16) ([]bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return nil, fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	bytes, err := m.client.ReadDiscreteInputs(offset, quantity)
	if err != nil {
		m.connected = false
		return nil, fmt.Errorf("modbus ReadDiscreteInputs error at %d: %w", address, err)
	}

	res := make([]bool, quantity)
	for i := 0; i < int(quantity); i++ {
		byteIndex := i / 8
		bitIndex := i % 8
		if byteIndex < len(bytes) {
			res[i] = (bytes[byteIndex] & (1 << bitIndex)) != 0
		}
	}
	return res, nil
}

func (m *ModbusTCPDriver) ReadHoldingRegisters(address uint16, quantity uint16) ([]uint16, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return nil, fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	bytes, err := m.client.ReadHoldingRegisters(offset, quantity)
	if err != nil {
		m.connected = false
		return nil, fmt.Errorf("modbus ReadHoldingRegisters error at %d: %w", address, err)
	}

	res := make([]uint16, quantity)
	for i := 0; i < int(quantity); i++ {
		if (i*2 + 1) < len(bytes) {
			res[i] = binary.BigEndian.Uint16(bytes[i*2 : i*2+2])
		}
	}
	return res, nil
}

func (m *ModbusTCPDriver) WriteSingleCoil(address uint16, value bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	val := uint16(0x0000)
	if value {
		val = uint16(0xFF00)
	}

	_, err := m.client.WriteSingleCoil(offset, val)
	if err != nil {
		m.connected = false
		return fmt.Errorf("modbus WriteSingleCoil error at %d: %w", address, err)
	}
	return nil
}

func (m *ModbusTCPDriver) WriteSingleRegister(address uint16, value uint16) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected || m.client == nil {
		return fmt.Errorf("modbus client not connected")
	}

	offset := normalizeAddress(address)
	_, err := m.client.WriteSingleRegister(offset, value)
	if err != nil {
		m.connected = false
		return fmt.Errorf("modbus WriteSingleRegister error at %d: %w", address, err)
	}
	return nil
}
