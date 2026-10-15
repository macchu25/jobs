package alarm_test

import (
	"os"
	"path/filepath"
	"testing"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/database"
)

func TestAlarmLifecycle(t *testing.T) {
	tmpDir, _ := os.MkdirTemp("", "alarm_test_*")
	defer os.RemoveAll(tmpDir)

	db, _ := database.Open(filepath.Join(tmpDir, "test.db"))
	defer db.Close()

	eng := alarm.NewEngine(db, nil)

	// 1. Raise alarm
	al, created := eng.Raise("TEST_FAULT", "WARNING", "Test fault occurred", "TEST")
	if !created {
		t.Fatalf("expected alarm to be newly created")
	}
	if al.Code != "TEST_FAULT" || !al.Active || al.Acknowledged {
		t.Errorf("unexpected alarm state: %+v", al)
	}

	if eng.GetActiveCount() != 1 {
		t.Errorf("expected active count 1, got %d", eng.GetActiveCount())
	}

	// 2. Duplicate raise does not duplicate
	_, created = eng.Raise("TEST_FAULT", "WARNING", "Test fault duplicate", "TEST")
	if created {
		t.Errorf("expected duplicate raise to not create new entry")
	}

	// 3. Acknowledge
	ackAl, err := eng.Acknowledge(al.ID)
	if err != nil {
		t.Fatalf("acknowledge failed: %v", err)
	}
	if !ackAl.Acknowledged || ackAl.AcknowledgedAt == nil {
		t.Errorf("expected acknowledged true with timestamp, got %+v", ackAl)
	}

	// 4. Clear
	clearedAl, cleared := eng.Clear("TEST_FAULT")
	if !cleared {
		t.Fatalf("expected alarm to be cleared")
	}
	if clearedAl.Active {
		t.Errorf("expected active false after clear")
	}
	if eng.GetActiveCount() != 0 {
		t.Errorf("expected active count 0, got %d", eng.GetActiveCount())
	}
}
