package command_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/command"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/plc/mock"
	"warehouse-hmi/internal/simulation"
)

func setupCommandEngine(t *testing.T) (*command.Engine, *machine.Service, *inventory.Service, *simulation.Engine, func()) {
	tmpDir, err := os.MkdirTemp("", "cmd_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	cfg := &config.Config{
		PLCMode:             "simulation",
		EnableRealPLCWrites: true,
		SimulationSpeed:     10.0, // fast tests
		PLCMap: config.PLCMapConfig{
			Bins: []config.BinMapConfig{
				{ID: "A01", Name: "Bin A01", ProductCode: "PRODUCT_A", ProductName: "Product A", Capacity: 20},
				{ID: "A02", Name: "Bin A02", ProductCode: "PRODUCT_B", ProductName: "Product B", Capacity: 20},
			},
		},
	}

	al := alarm.NewEngine(db, nil)
	m := machine.NewService(cfg, al, nil)
	inv, _ := inventory.NewService(cfg, db, nil)
	sim := simulation.NewEngine(cfg, m, inv, al)
	sim.SetSpeed(20.0)

	mockAdapter := mock.NewMockPLCAdapter(sim, m, inv, al)
	_ = mockAdapter.Connect(context.Background())

	cmdEng := command.NewEngine(db, mockAdapter, m, inv, al, nil)

	cleanup := func() {
		_ = db.Close()
		_ = os.RemoveAll(tmpDir)
	}

	return cmdEng, m, inv, sim, cleanup
}

func TestCallItemSuccess(t *testing.T) {
	cmdEng, _, inv, _, cleanup := setupCommandEngine(t)
	defer cleanup()

	// Initial A01 quantity is 12
	cmd, err := cmdEng.CallItem(context.Background(), "A01", "testuser", "127.0.0.1")
	if err != nil {
		t.Fatalf("expected call item to succeed, got %v", err)
	}
	if cmd.Status != "PENDING" {
		t.Errorf("expected initial status PENDING, got %s", cmd.Status)
	}

	// Wait for async execution
	time.Sleep(300 * time.Millisecond)

	bin, _ := inv.GetBin("A01")
	if bin.Quantity != 11 {
		t.Errorf("expected quantity to decrease to 11, got %d", bin.Quantity)
	}
}

func TestCallItemEmptyBinRejection(t *testing.T) {
	cmdEng, _, inv, _, cleanup := setupCommandEngine(t)
	defer cleanup()

	_, _ = inv.SetQuantity("A01", 0, "Make empty")

	_, err := cmdEng.CallItem(context.Background(), "A01", "testuser", "127.0.0.1")
	if err == nil {
		t.Fatalf("expected error for empty bin, got nil")
	}
	if !strings.Contains(err.Error(), "BIN_EMPTY") {
		t.Errorf("expected BIN_EMPTY in error, got %v", err)
	}
}

func TestCallItemBusyBinRejection(t *testing.T) {
	cmdEng, _, inv, _, cleanup := setupCommandEngine(t)
	defer cleanup()

	inv.SetBinBusy("A01", true)

	_, err := cmdEng.CallItem(context.Background(), "A01", "testuser", "127.0.0.1")
	if err == nil {
		t.Fatalf("expected error for busy bin, got nil")
	}
	if !strings.Contains(err.Error(), "BIN_BUSY") {
		t.Errorf("expected BIN_BUSY in error, got %v", err)
	}
}

func TestEmergencyStopInterlock(t *testing.T) {
	cmdEng, m, _, _, cleanup := setupCommandEngine(t)
	defer cleanup()

	m.SetEmergencyStop(true)

	_, err := cmdEng.CallItem(context.Background(), "A01", "testuser", "127.0.0.1")
	if err == nil {
		t.Fatalf("expected error when E-STOP active, got nil")
	}
	if !strings.Contains(err.Error(), "Emergency Stop") {
		t.Errorf("expected Emergency Stop error, got %v", err)
	}
}
