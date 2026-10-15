package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	ServerHost            string
	ServerPort            int
	AppEnv                string
	PLCMode               string // "simulation" or "real"
	PLCProtocol           string // "modbus_tcp"
	PLCHost               string
	PLCPort               int
	PLCUnitID             byte
	PLCPollIntervalMs     int
	EnableRealPLCWrites   bool
	CommandAckTimeoutMs   int
	CommandExecTimeoutMs  int
	DatabasePath          string
	AuthEnabled           bool
	AdminDefaultPassword  string
	OperatorDefaultPassword string
	LogLevel              string
	SimulationSpeed       float64
	PLCMap                PLCMapConfig
}

type PLCMapConfig struct {
	Protocol  string               `yaml:"protocol"`
	Version   string               `yaml:"version"`
	Machine   MachineMapConfig     `yaml:"machine"`
	Conveyor  ConveyorMapConfig    `yaml:"conveyor"`
	Sensors   SensorsMapConfig     `yaml:"sensors"`
	Handshake HandshakeMapConfig   `yaml:"handshake"`
	Bins      []BinMapConfig       `yaml:"bins"`
}

type SignalAddress struct {
	Type        string `yaml:"type"`        // coil, discrete_input, holding_register, input_register
	Address     int    `yaml:"address"`
	Bit         int    `yaml:"bit,omitempty"`
	Description string `yaml:"description,omitempty"`
}

type MachineMapConfig struct {
	AutoMode      SignalAddress `yaml:"auto_mode"`
	Running       SignalAddress `yaml:"running"`
	EmergencyStop SignalAddress `yaml:"emergency_stop"`
	AlarmActive   SignalAddress `yaml:"alarm_active"`
}

type ConveyorMapConfig struct {
	Running      SignalAddress `yaml:"running"`
	StartCommand SignalAddress `yaml:"start_command"`
	StopCommand  SignalAddress `yaml:"stop_command"`
}

type SensorsMapConfig struct {
	InputSensor  SignalAddress `yaml:"input_sensor"`
	OutputSensor SignalAddress `yaml:"output_sensor"`
}

type HandshakeMapConfig struct {
	CallRequest      SignalAddress `yaml:"call_request"`
	CallBinCode      SignalAddress `yaml:"call_bin_code"`
	CommandBusy      SignalAddress `yaml:"command_busy"`
	CommandDone      SignalAddress `yaml:"command_done"`
	CommandError     SignalAddress `yaml:"command_error"`
	CommandErrorCode SignalAddress `yaml:"command_error_code"`
}

type BinMapConfig struct {
	ID                   string        `yaml:"id"`
	Name                 string        `yaml:"name"`
	ProductCode          string        `yaml:"product_code"`
	ProductName          string        `yaml:"product_name"`
	Capacity             int           `yaml:"capacity"`
	BinNumericCode       int           `yaml:"bin_numeric_code"`
	Quantity             SignalAddress `yaml:"quantity"`
	Sensor               SignalAddress `yaml:"sensor"`
	CallCommand          SignalAddress `yaml:"call_command"`
	PusherExtend         SignalAddress `yaml:"pusher_extend"`
	PusherRetract        SignalAddress `yaml:"pusher_retract"`
	PusherExtendedSensor SignalAddress `yaml:"pusher_extended_sensor"`
}

// LoadConfig reads .env (if present) and plc-map.yaml, validating all parameters.
func LoadConfig(envPath, plcMapPath string) (*Config, error) {
	// Try loading .env
	if envPath != "" {
		_ = loadDotEnv(envPath)
	} else {
		_ = loadDotEnv(".env")
	}

	cfg := &Config{
		ServerHost:           getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort:           getEnvInt("SERVER_PORT", 8080),
		AppEnv:               getEnv("APP_ENV", "development"),
		PLCMode:              strings.ToLower(getEnv("PLC_MODE", "simulation")),
		PLCProtocol:          strings.ToLower(getEnv("PLC_PROTOCOL", "modbus_tcp")),
		PLCHost:              getEnv("PLC_HOST", "192.168.1.20"),
		PLCPort:              getEnvInt("PLC_PORT", 502),
		PLCUnitID:            byte(getEnvInt("PLC_UNIT_ID", 1)),
		PLCPollIntervalMs:    getEnvInt("PLC_POLL_INTERVAL_MS", 250),
		EnableRealPLCWrites:  getEnvBool("ENABLE_REAL_PLC_WRITES", false),
		CommandAckTimeoutMs:  getEnvInt("COMMAND_ACK_TIMEOUT_MS", 3000),
		CommandExecTimeoutMs: getEnvInt("COMMAND_EXECUTION_TIMEOUT_MS", 15000),
		DatabasePath:         getEnv("DATABASE_PATH", "./data/hmi.db"),
		AuthEnabled:          getEnvBool("AUTH_ENABLED", false),
		AdminDefaultPassword: getEnv("ADMIN_DEFAULT_PASSWORD", "admin123"),
		OperatorDefaultPassword: getEnv("OPERATOR_DEFAULT_PASSWORD", "operator123"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		SimulationSpeed:      getEnvFloat("SIMULATION_SPEED", 1.0),
	}

	// Load PLC map YAML
	if plcMapPath == "" {
		// look in common locations
		candidates := []string{"configs/plc-map.yaml", "../configs/plc-map.yaml", "../../configs/plc-map.yaml"}
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				plcMapPath = c
				break
			}
		}
	}

	if plcMapPath != "" {
		data, err := os.ReadFile(plcMapPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read plc map config at %s: %w", plcMapPath, err)
		}
		if err := yaml.Unmarshal(data, &cfg.PLCMap); err != nil {
			return nil, fmt.Errorf("invalid YAML in plc map config: %w", err)
		}
	} else {
		return nil, fmt.Errorf("plc-map.yaml could not be found")
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate performs structural checks on loaded configuration.
func (c *Config) Validate() error {
	if c.PLCMode != "simulation" && c.PLCMode != "real" {
		return fmt.Errorf("invalid PLC_MODE %q; must be 'simulation' or 'real'", c.PLCMode)
	}

	if c.PLCMode == "real" {
		if strings.TrimSpace(c.PLCHost) == "" {
			return fmt.Errorf("PLC_HOST cannot be empty when PLC_MODE=real")
		}
		if c.PLCPort <= 0 || c.PLCPort > 65535 {
			return fmt.Errorf("invalid PLC_PORT %d; must be between 1 and 65535", c.PLCPort)
		}
		if c.PLCProtocol != "modbus_tcp" {
			// Do not fake support for unimplemented protocols
			return fmt.Errorf("%s_DRIVER_NOT_CONFIGURED: driver for protocol %q is not implemented or configured",
				strings.ToUpper(c.PLCProtocol), c.PLCProtocol)
		}
	}

	if len(c.PLCMap.Bins) == 0 {
		return fmt.Errorf("plc-map.yaml must define at least 1 bin")
	}

	seenIDs := make(map[string]bool)
	for _, b := range c.PLCMap.Bins {
		if b.ID == "" {
			return fmt.Errorf("all bins in plc-map.yaml must have a non-empty id")
		}
		if seenIDs[b.ID] {
			return fmt.Errorf("duplicate bin id %q in plc-map.yaml", b.ID)
		}
		seenIDs[b.ID] = true
	}

	return nil
}

func loadDotEnv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			// remove optional quotes
			val = strings.Trim(val, `"'`)
			// Only set if not already set in environment
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
	return scanner.Err()
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		lower := strings.ToLower(val)
		return lower == "true" || lower == "1" || lower == "yes"
	}
	return defaultVal
}

func (c *Config) DataDir() string {
	return filepath.Dir(c.DatabasePath)
}
