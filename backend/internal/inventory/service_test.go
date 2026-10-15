package inventory_test

import (
	"os"
	"path/filepath"
	"testing"

	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/inventory"
)

func setupTestDB(t *testing.T) (*database.DB, *config.Config, func()) {
	tmpDir, err := os.MkdirTemp("", "hmi_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	cfg := &config.Config{
		PLCMap: config.PLCMapConfig{
			Bins: []config.BinMapConfig{
				{ID: "A01", Name: "Bin A01", ProductCode: "PRODUCT_A", ProductName: "Product A", Capacity: 20},
				{ID: "A02", Name: "Bin A02", ProductCode: "PRODUCT_B", ProductName: "Product B", Capacity: 20},
			},
		},
	}

	cleanup := func() {
		_ = db.Close()
		_ = os.RemoveAll(tmpDir)
	}

	return db, cfg, cleanup
}

func TestInventoryIncrementDecrement(t *testing.T) {
	db, cfg, cleanup := setupTestDB(t)
	defer cleanup()

	svc, err := inventory.NewService(cfg, db, nil)
	if err != nil {
		t.Fatalf("failed to init inventory service: %v", err)
	}

	// Initial quantity for A01 is 12
	b, err := svc.GetBin("A01")
	if err != nil {
		t.Fatalf("failed to get bin A01: %v", err)
	}
	if b.Quantity != 12 {
		t.Errorf("expected initial quantity 12, got %d", b.Quantity)
	}

	// Decrement by 1
	updated, err := svc.Decrement("A01", 1, "Dispense test")
	if err != nil {
		t.Fatalf("decrement failed: %v", err)
	}
	if updated.Quantity != 11 {
		t.Errorf("expected 11 after decrement, got %d", updated.Quantity)
	}

	// Increment by 2
	updated, err = svc.Increment("A01", 2, "Restock test")
	if err != nil {
		t.Fatalf("increment failed: %v", err)
	}
	if updated.Quantity != 13 {
		t.Errorf("expected 13 after increment, got %d", updated.Quantity)
	}

	// Exceed capacity test
	_, err = svc.Increment("A01", 100, "Overflow")
	if err == nil {
		t.Errorf("expected error when exceeding capacity, got nil")
	}

	// Underflow test
	_, err = svc.Decrement("A01", 20, "Underflow")
	if err == nil {
		t.Errorf("expected error when quantity insufficient, got nil")
	}
}

func TestInventoryStatusCalculation(t *testing.T) {
	db, cfg, cleanup := setupTestDB(t)
	defer cleanup()

	svc, _ := inventory.NewService(cfg, db, nil)

	_, _ = svc.SetQuantity("A01", 0, "Set empty")
	b, _ := svc.GetBin("A01")
	if b.Status != "EMPTY" {
		t.Errorf("expected status EMPTY, got %s", b.Status)
	}

	_, _ = svc.SetQuantity("A01", 2, "Set low")
	b, _ = svc.GetBin("A01")
	if b.Status != "LOW" {
		t.Errorf("expected status LOW, got %s", b.Status)
	}

	_, _ = svc.SetQuantity("A01", 15, "Set available")
	b, _ = svc.GetBin("A01")
	if b.Status != "AVAILABLE" {
		t.Errorf("expected status AVAILABLE, got %s", b.Status)
	}

	_, _ = svc.SetQuantity("A01", 20, "Set full")
	b, _ = svc.GetBin("A01")
	if b.Status != "FULL" {
		t.Errorf("expected status FULL, got %s", b.Status)
	}
}
