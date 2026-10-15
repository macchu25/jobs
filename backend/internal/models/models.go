package models

import (
	"time"
)

// MachineStatus represents the overall state of the sorting and dispensing line.
type MachineStatus struct {
	PLCConnected       bool      `json:"plcConnected"`
	PLCStatus          string    `json:"plcStatus"` // "CONNECTED", "DISCONNECTED", "CONNECTING", "ERROR"
	Mode               string    `json:"mode"`      // "simulation" or "real"
	MachineMode        string    `json:"machineMode"` // "AUTO" or "MANUAL"
	MachineState       string    `json:"machineState"` // "IDLE", "RUNNING", "SORTING", "DISPENSING", "ALARM", "EMERGENCY_STOP"
	ConveyorRunning    bool      `json:"conveyorRunning"`
	EmergencyStop      bool      `json:"emergencyStop"`
	RealWritesEnabled  bool      `json:"realWritesEnabled"`
	ActiveAlarmCount   int       `json:"activeAlarmCount"`
	LastUpdate         time.Time `json:"lastUpdate"`
}

// Bin represents a storage compartment on the warehouse rack.
type Bin struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	ProductCode    string `json:"productCode"`
	ProductName    string `json:"productName"`
	Quantity       int    `json:"quantity"`
	Capacity       int    `json:"capacity"`
	Status         string `json:"status"` // "EMPTY", "LOW", "AVAILABLE", "FULL", "ERROR", "DISABLED"
	SensorActive   bool   `json:"sensorActive"`
	Busy           bool   `json:"busy"`
	PusherExtended bool   `json:"pusherExtended"`
}

// Sensor captures the live status of discrete photo-eyes and position detectors.
type Sensor struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Active    bool      `json:"active"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Actuator describes physical or simulated cylinders, diverters, and motors.
type Actuator struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	State     string    `json:"state"` // "RETRACTED", "EXTENDED", "RUNNING", "STOPPED"
	UpdatedAt time.Time `json:"updatedAt"`
}

// Alarm tracks active and historical industrial warnings and faults.
type Alarm struct {
	ID             string     `json:"id"`
	Code           string     `json:"code"`
	Severity       string     `json:"severity"` // "INFO", "WARNING", "ERROR", "CRITICAL"
	Message        string     `json:"message"`
	Source         string     `json:"source"`
	Active         bool       `json:"active"`
	Acknowledged   bool       `json:"acknowledged"`
	CreatedAt      time.Time  `json:"createdAt"`
	AcknowledgedAt *time.Time `json:"acknowledgedAt,omitempty"`
	ClearedAt      *time.Time `json:"clearedAt,omitempty"`
}

// Command tracks the execution state of operations sent by operators or automation.
type Command struct {
	ID           string     `json:"id"`
	Type         string     `json:"type"` // "CALL_ITEM", "START_CONVEYOR", "STOP_CONVEYOR", "PUSH", "RETRACT", "RESET_ALARM"
	BinID        string     `json:"binId,omitempty"`
	Status       string     `json:"status"` // "PENDING", "VALIDATING", "SENT_TO_PLC", "RUNNING", "WAITING_CONFIRMATION", "COMPLETED", "FAILED", "CANCELLED"
	ErrorCode    string     `json:"errorCode,omitempty"`
	ErrorMessage string     `json:"errorMessage,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	CompletedAt  *time.Time `json:"completedAt,omitempty"`
}

// Event is an operational log record for traceability.
type Event struct {
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	EventType   string    `json:"eventType"`
	Source      string    `json:"source"`
	BinID       string    `json:"binId,omitempty"`
	Product     string    `json:"product,omitempty"`
	Description string    `json:"description"`
	CommandID   string    `json:"commandId,omitempty"`
	Result      string    `json:"result"`
}

// AuditLog tracks user control commands for compliance.
type AuditLog struct {
	ID         string    `json:"id"`
	Timestamp  time.Time `json:"timestamp"`
	User       string    `json:"user"`
	IP         string    `json:"ip"`
	Command    string    `json:"command"`
	Target     string    `json:"target"`
	Parameters string    `json:"parameters,omitempty"`
	Result     string    `json:"result"`
}

// User accounts for local authentication.
type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"` // "VIEWER", "OPERATOR", "ADMIN"
	CreatedAt    time.Time `json:"createdAt"`
}

// SystemSnapshot is the initial full state payload delivered to newly connected clients.
type SystemSnapshot struct {
	ServerTime       time.Time     `json:"serverTime"`
	PLCStatus        string        `json:"plcStatus"`
	Mode             string        `json:"mode"`
	Machine          MachineStatus `json:"machine"`
	ConveyorRunning  bool          `json:"conveyorRunning"`
	Bins             []Bin         `json:"bins"`
	Sensors          []Sensor      `json:"sensors"`
	Actuators        []Actuator    `json:"actuators"`
	Alarms           []Alarm       `json:"alarms"`
	ActiveCommands   []Command     `json:"activeCommands"`
	ServerUptimeSecs int64         `json:"serverUptimeSecs"`
}
