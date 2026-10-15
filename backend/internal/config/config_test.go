package config_test

import (
	"os"
	"testing"

	"warehouse-hmi/internal/config"
)

func TestConfigLoadAndValidation(t *testing.T) {
	// Write temporary plc-map.yaml
	yamlContent := `
protocol: modbus_tcp
version: "1.0"
machine:
  auto_mode: { type: discrete_input, address: 10001 }
  running: { type: discrete_input, address: 10002 }
  emergency_stop: { type: discrete_input, address: 10003 }
conveyor:
  running: { type: discrete_input, address: 10010 }
  start_command: { type: coil, address: 10 }
  stop_command: { type: coil, address: 11 }
sensors:
  input_sensor: { type: discrete_input, address: 10020 }
  output_sensor: { type: discrete_input, address: 10021 }
handshake:
  call_request: { type: coil, address: 50 }
  call_bin_code: { type: holding_register, address: 40100 }
  command_busy: { type: discrete_input, address: 10050 }
  command_done: { type: discrete_input, address: 10051 }
  command_error: { type: discrete_input, address: 10052 }
  command_error_code: { type: input_register, address: 30050 }
bins:
  - id: "A01"
    name: "Bin A01"
    product_code: "PRODUCT_A"
    product_name: "Product A"
    capacity: 20
    bin_numeric_code: 101
    quantity: { type: holding_register, address: 40001 }
    sensor: { type: discrete_input, address: 10031 }
    call_command: { type: coil, address: 101 }
    pusher_extend: { type: coil, address: 111 }
    pusher_retract: { type: coil, address: 121 }
    pusher_extended_sensor: { type: discrete_input, address: 10061 }
`
	tmpYaml, err := os.CreateTemp("", "plc-map-*.yaml")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpYaml.Name())
	_, _ = tmpYaml.WriteString(yamlContent)
	_ = tmpYaml.Close()

	cfg, err := config.LoadConfig("", tmpYaml.Name())
	if err != nil {
		t.Fatalf("failed to load valid config: %v", err)
	}

	if cfg.PLCMode != "simulation" {
		t.Errorf("expected default PLCMode simulation, got %s", cfg.PLCMode)
	}
	if len(cfg.PLCMap.Bins) != 1 || cfg.PLCMap.Bins[0].ID != "A01" {
		t.Errorf("expected 1 bin with ID A01, got %+v", cfg.PLCMap.Bins)
	}

	// Test real mode with unsupported protocol (e.g. S7)
	cfg.PLCMode = "real"
	cfg.PLCProtocol = "s7"
	err = cfg.Validate()
	if err == nil || err.Error() != "S7_DRIVER_NOT_CONFIGURED: driver for protocol \"s7\" is not implemented or configured" {
		t.Errorf("expected S7_DRIVER_NOT_CONFIGURED error, got %v", err)
	}
}
