package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
	"golang.org/x/crypto/bcrypt"
	"warehouse-hmi/internal/models"
)

type DB struct {
	db *sql.DB
	mu sync.RWMutex
}

func Open(dbPath string) (*DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	dsn := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)", dbPath)
	sqldb, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	sqldb.SetMaxOpenConns(1) // SQLite single writer thread-safety

	d := &DB{db: sqldb}
	if err := d.migrate(); err != nil {
		_ = sqldb.Close()
		return nil, fmt.Errorf("database migration failed: %w", err)
	}

	return d, nil
}

func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL,
			created_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS bins_metadata (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			product_code TEXT NOT NULL,
			product_name TEXT NOT NULL,
			capacity INTEGER NOT NULL,
			quantity INTEGER NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS commands (
			id TEXT PRIMARY KEY,
			type TEXT NOT NULL,
			bin_id TEXT,
			status TEXT NOT NULL,
			error_code TEXT,
			error_message TEXT,
			created_at DATETIME NOT NULL,
			started_at DATETIME,
			completed_at DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS alarms (
			id TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			severity TEXT NOT NULL,
			message TEXT NOT NULL,
			source TEXT NOT NULL,
			active INTEGER NOT NULL,
			acknowledged INTEGER NOT NULL,
			created_at DATETIME NOT NULL,
			acknowledged_at DATETIME,
			cleared_at DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS events (
			id TEXT PRIMARY KEY,
			timestamp DATETIME NOT NULL,
			event_type TEXT NOT NULL,
			source TEXT NOT NULL,
			bin_id TEXT,
			product TEXT,
			description TEXT NOT NULL,
			command_id TEXT,
			result TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id TEXT PRIMARY KEY,
			timestamp DATETIME NOT NULL,
			user TEXT NOT NULL,
			ip TEXT NOT NULL,
			command TEXT NOT NULL,
			target TEXT NOT NULL,
			parameters TEXT,
			result TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS inventory_history (
			id TEXT PRIMARY KEY,
			timestamp DATETIME NOT NULL,
			bin_id TEXT NOT NULL,
			change_amount INTEGER NOT NULL,
			new_quantity INTEGER NOT NULL,
			reason TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_alarms_active ON alarms(active);`,
		`CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);`,
	}

	for _, q := range queries {
		if _, err := d.db.Exec(q); err != nil {
			return err
		}
	}

	return nil
}

// SeedDefaultUsers creates default admin and operator users if missing.
func (d *DB) SeedDefaultUsers(adminPass, operatorPass string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	var count int
	err := d.db.QueryRow(`SELECT COUNT(*) FROM users;`).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hashAdmin, err := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	hashOp, err := bcrypt.GenerateFromPassword([]byte(operatorPass), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	_, err = d.db.Exec(`
		INSERT INTO users (id, username, password_hash, role, created_at) VALUES 
		(?, ?, ?, ?, ?),
		(?, ?, ?, ?, ?);
	`,
		uuid.New().String(), "admin", string(hashAdmin), "ADMIN", now,
		uuid.New().String(), "operator", string(hashOp), "OPERATOR", now,
	)
	return err
}

// LogAudit writes an administrative or control action into audit_logs.
func (d *DB) LogAudit(user, ip, command, target, params, result string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	_, err := d.db.Exec(`
		INSERT INTO audit_logs (id, timestamp, user, ip, command, target, parameters, result)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);
	`, id, time.Now().UTC(), user, ip, command, target, params, result)
	return err
}

// LogEvent records system events.
func (d *DB) LogEvent(e models.Event) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.Timestamp.IsZero() {
		e.Timestamp = time.Now().UTC()
	}

	_, err := d.db.Exec(`
		INSERT INTO events (id, timestamp, event_type, source, bin_id, product, description, command_id, result)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
	`, e.ID, e.Timestamp, e.EventType, e.Source, e.BinID, e.Product, e.Description, e.CommandID, e.Result)
	return err
}

// GetEvents queries events with optional filters.
func (d *DB) GetEvents(limit int, eventType, binID string) ([]models.Event, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if limit <= 0 || limit > 500 {
		limit = 100
	}

	query := `SELECT id, timestamp, event_type, source, COALESCE(bin_id, ''), COALESCE(product, ''), description, COALESCE(command_id, ''), result 
	          FROM events WHERE 1=1`
	args := []interface{}{}

	if eventType != "" {
		query += ` AND event_type = ?`
		args = append(args, eventType)
	}
	if binID != "" {
		query += ` AND bin_id = ?`
		args = append(args, binID)
	}

	query += ` ORDER BY timestamp DESC LIMIT ?`
	args = append(args, limit)

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var e models.Event
		if err := rows.Scan(&e.ID, &e.Timestamp, &e.EventType, &e.Source, &e.BinID, &e.Product, &e.Description, &e.CommandID, &e.Result); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

// SaveCommand records or updates a command.
func (d *DB) SaveCommand(cmd models.Command) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		INSERT INTO commands (id, type, bin_id, status, error_code, error_message, created_at, started_at, completed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			status = excluded.status,
			error_code = excluded.error_code,
			error_message = excluded.error_message,
			started_at = excluded.started_at,
			completed_at = excluded.completed_at;
	`, cmd.ID, cmd.Type, cmd.BinID, cmd.Status, cmd.ErrorCode, cmd.ErrorMessage, cmd.CreatedAt, cmd.StartedAt, cmd.CompletedAt)
	return err
}

// GetRecentCommands returns recent commands.
func (d *DB) GetRecentCommands(limit int) ([]models.Command, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if limit <= 0 || limit > 200 {
		limit = 50
	}

	rows, err := d.db.Query(`
		SELECT id, type, COALESCE(bin_id, ''), status, COALESCE(error_code, ''), COALESCE(error_message, ''), created_at, started_at, completed_at
		FROM commands ORDER BY created_at DESC LIMIT ?;
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cmds []models.Command
	for rows.Next() {
		var c models.Command
		if err := rows.Scan(&c.ID, &c.Type, &c.BinID, &c.Status, &c.ErrorCode, &c.ErrorMessage, &c.CreatedAt, &c.StartedAt, &c.CompletedAt); err != nil {
			return nil, err
		}
		cmds = append(cmds, c)
	}
	return cmds, nil
}

// SaveAlarm creates or updates an alarm.
func (d *DB) SaveAlarm(a models.Alarm) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	activeInt := 0
	if a.Active {
		activeInt = 1
	}
	ackInt := 0
	if a.Acknowledged {
		ackInt = 1
	}

	_, err := d.db.Exec(`
		INSERT INTO alarms (id, code, severity, message, source, active, acknowledged, created_at, acknowledged_at, cleared_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			active = excluded.active,
			acknowledged = excluded.acknowledged,
			acknowledged_at = excluded.acknowledged_at,
			cleared_at = excluded.cleared_at;
	`, a.ID, a.Code, a.Severity, a.Message, a.Source, activeInt, ackInt, a.CreatedAt, a.AcknowledgedAt, a.ClearedAt)
	return err
}

// GetAlarms loads active or recent alarms.
func (d *DB) GetAlarms(activeOnly bool) ([]models.Alarm, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `SELECT id, code, severity, message, source, active, acknowledged, created_at, acknowledged_at, cleared_at FROM alarms`
	if activeOnly {
		query += ` WHERE active = 1`
	}
	query += ` ORDER BY created_at DESC LIMIT 100;`

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alarms []models.Alarm
	for rows.Next() {
		var a models.Alarm
		var act, ack int
		if err := rows.Scan(&a.ID, &a.Code, &a.Severity, &a.Message, &a.Source, &act, &ack, &a.CreatedAt, &a.AcknowledgedAt, &a.ClearedAt); err != nil {
			return nil, err
		}
		a.Active = act == 1
		a.Acknowledged = ack == 1
		alarms = append(alarms, a)
	}
	return alarms, nil
}

// SaveBinMetadata stores or updates persistent bin definition and quantity.
func (d *DB) SaveBinMetadata(b models.Bin) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		INSERT INTO bins_metadata (id, name, product_code, product_name, capacity, quantity, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			product_code = excluded.product_code,
			product_name = excluded.product_name,
			capacity = excluded.capacity,
			quantity = excluded.quantity,
			updated_at = excluded.updated_at;
	`, b.ID, b.Name, b.ProductCode, b.ProductName, b.Capacity, b.Quantity, time.Now().UTC())
	return err
}

// LoadBinsMetadata returns saved bin records.
func (d *DB) LoadBinsMetadata() (map[string]models.Bin, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`SELECT id, name, product_code, product_name, capacity, quantity FROM bins_metadata;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]models.Bin)
	for rows.Next() {
		var b models.Bin
		if err := rows.Scan(&b.ID, &b.Name, &b.ProductCode, &b.ProductName, &b.Capacity, &b.Quantity); err != nil {
			return nil, err
		}
		result[b.ID] = b
	}
	return result, nil
}

// LogInventoryHistory records physical or simulated inventory changes.
func (d *DB) LogInventoryHistory(binID string, change, newQty int, reason string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	id := uuid.New().String()
	_, err := d.db.Exec(`
		INSERT INTO inventory_history (id, timestamp, bin_id, change_amount, new_quantity, reason)
		VALUES (?, ?, ?, ?, ?, ?);
	`, id, time.Now().UTC(), binID, change, newQty, reason)
	return err
}

// GetUserByUsername fetches a user for authentication.
func (d *DB) GetUserByUsername(username string) (*models.User, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var u models.User
	err := d.db.QueryRow(`
		SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?;
	`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}
