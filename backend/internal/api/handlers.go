package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/auth"
	"warehouse-hmi/internal/command"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/models"
	"warehouse-hmi/internal/plc"
	"warehouse-hmi/internal/simulation"
	"warehouse-hmi/internal/websocket"
)

type API struct {
	cfg          *config.Config
	db           *database.DB
	hub          *websocket.Hub
	machineSvc   *machine.Service
	invSvc       *inventory.Service
	cmdEng       *command.Engine
	alarmEng     *alarm.Engine
	simEng       *simulation.Engine
	authMgr      *auth.Manager
	adapter      plc.PLCAdapter
	mockAdapter  plc.PLCAdapter
	realAdapter  plc.PLCAdapter
	startTime    time.Time
}

func NewAPI(
	cfg *config.Config,
	db *database.DB,
	hub *websocket.Hub,
	m *machine.Service,
	inv *inventory.Service,
	cmd *command.Engine,
	al *alarm.Engine,
	sim *simulation.Engine,
	authM *auth.Manager,
	mockAdapter plc.PLCAdapter,
	realAdapter plc.PLCAdapter,
) *API {
	return &API{
		cfg:         cfg,
		db:          db,
		hub:         hub,
		machineSvc:  m,
		invSvc:      inv,
		cmdEng:      cmd,
		alarmEng:    al,
		simEng:      sim,
		authMgr:     authM,
		adapter:     mockAdapter,
		mockAdapter: mockAdapter,
		realAdapter: realAdapter,
		startTime:   time.Now().UTC(),
	}
}

func (a *API) SetActiveAdapter(adapter plc.PLCAdapter) {
	a.adapter = adapter
	a.cmdEng.SetAdapter(adapter)
}

// JSON helpers
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

// SnapshotProvider implementation
func (a *API) GetSnapshot() models.SystemSnapshot {
	status := a.machineSvc.GetStatus()
	return models.SystemSnapshot{
		ServerTime:       time.Now().UTC(),
		PLCStatus:        status.PLCStatus,
		Mode:             status.Mode,
		Machine:          status,
		ConveyorRunning:  status.ConveyorRunning,
		Bins:             a.invSvc.GetBins(),
		Sensors:          a.machineSvc.GetSensors(),
		Actuators:        a.machineSvc.GetActuators(),
		Alarms:           a.alarmEng.GetActiveAlarms(),
		ActiveCommands:   a.cmdEng.GetActiveCommands(),
		ServerUptimeSecs: int64(time.Since(a.startTime).Seconds()),
	}
}

// Routes
func (a *API) RegisterRoutes(mux *http.ServeMux) {
	// CORS and OPTIONS handling
	mux.HandleFunc("/api/health", a.handleHealth)
	mux.HandleFunc("/api/status", a.handleStatus)
	mux.HandleFunc("/api/config/public", a.handlePublicConfig)

	// Auth
	mux.HandleFunc("/api/auth/login", a.handleLogin)
	mux.HandleFunc("/api/auth/logout", a.handleLogout)
	mux.HandleFunc("/api/auth/me", a.handleMe)

	// Bins
	mux.HandleFunc("/api/bins", a.handleBins)
	mux.HandleFunc("/api/bins/", a.handleBinDetailAndCall)

	// Sensors & Actuators
	mux.HandleFunc("/api/sensors", a.handleSensors)
	mux.HandleFunc("/api/actuators", a.handleActuators)

	// Alarms
	mux.HandleFunc("/api/alarms", a.handleAlarms)
	mux.HandleFunc("/api/alarms/", a.handleAlarmAck)
	mux.HandleFunc("/api/alarms/reset", a.handleAlarmReset)

	// History & Commands
	mux.HandleFunc("/api/history", a.handleHistory)
	mux.HandleFunc("/api/commands", a.handleCommands)

	// Machine controls
	mux.HandleFunc("/api/machine/auto", a.handleMachineAuto)
	mux.HandleFunc("/api/machine/manual", a.handleMachineManual)
	mux.HandleFunc("/api/conveyor/start", a.handleConveyorStart)
	mux.HandleFunc("/api/conveyor/stop", a.handleConveyorStop)
	mux.HandleFunc("/api/mode", a.handleModeSwitch)

	// Manual Controls
	mux.HandleFunc("/api/manual/bins/", a.handleManualPusher)

	// Simulation Controls
	mux.HandleFunc("/api/simulation/start", a.handleSimStart)
	mux.HandleFunc("/api/simulation/stop", a.handleSimStop)
	mux.HandleFunc("/api/simulation/reset", a.handleSimReset)
	mux.HandleFunc("/api/simulation/items/random", a.handleSimRandomItem)
	mux.HandleFunc("/api/simulation/items", a.handleSimItem)
	mux.HandleFunc("/api/simulation/jam", a.handleSimJam)
	mux.HandleFunc("/api/simulation/plc-disconnect", a.handleSimDisconnect)
	mux.HandleFunc("/api/simulation/speed", a.handleSimSpeed)

	// WebSocket
	mux.HandleFunc("/ws", a.hub.ServeWS)
}

// Handlers
func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}
	m := a.machineSvc.GetStatus()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":           "ok",
		"server":           true,
		"database":         true,
		"plc":              m.PLCConnected,
		"websocketClients": a.hub.ClientCount(),
		"uptime":           int64(time.Since(a.startTime).Seconds()),
	})
}

func (a *API) handleStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.GetSnapshot())
}

func (a *API) handlePublicConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"plcMode":             a.cfg.PLCMode,
		"plcProtocol":         a.cfg.PLCProtocol,
		"plcHost":             a.cfg.PLCHost,
		"plcPort":             a.cfg.PLCPort,
		"pollIntervalMs":      a.cfg.PLCPollIntervalMs,
		"enableRealPLCWrites": a.cfg.EnableRealPLCWrites,
		"authEnabled":         a.cfg.AuthEnabled,
		"serverVersion":       "1.0.0",
		"environment":         a.cfg.AppEnv,
	})
}

func (a *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	sess, err := a.authMgr.Login(req.Username, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "AUTH_FAILED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": sess.Token,
		"user":  sess.User,
	})
}

func (a *API) handleLogout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		a.authMgr.Logout(token)
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (a *API) handleMe(w http.ResponseWriter, r *http.Request) {
	user, _ := a.authMgr.ExtractUserAndIP(r)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"username":    user,
		"authEnabled": a.authMgr.IsAuthEnabled(),
	})
}

func (a *API) handleBins(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "GET required")
		return
	}
	writeJSON(w, http.StatusOK, a.invSvc.GetBins())
}

func (a *API) handleBinDetailAndCall(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/bins/")
	parts := strings.Split(path, "/")
	binID := parts[0]

	if len(parts) == 1 && r.Method == http.MethodGet {
		bin, err := a.invSvc.GetBin(binID)
		if err != nil {
			writeError(w, http.StatusNotFound, "BIN_NOT_FOUND", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, bin)
		return
	}

	if len(parts) == 2 && parts[1] == "call" && r.Method == http.MethodPost {
		user, ip := a.authMgr.ExtractUserAndIP(r)
		cmd, err := a.cmdEng.CallItem(r.Context(), binID, user, ip)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "BIN_BUSY") {
				status = http.StatusConflict
			} else if strings.Contains(err.Error(), "WRITE LOCKED") {
				status = http.StatusForbidden
			}
			writeError(w, status, "CALL_FAILED", err.Error())
			return
		}
		writeJSON(w, http.StatusAccepted, cmd)
		return
	}

	writeError(w, http.StatusNotFound, "NOT_FOUND", "Endpoint not found")
}

func (a *API) handleSensors(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.machineSvc.GetSensors())
}

func (a *API) handleActuators(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.machineSvc.GetActuators())
}

func (a *API) handleAlarms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "GET required")
		return
	}
	activeOnly := r.URL.Query().Get("active") == "true"
	alarms, err := a.db.GetAlarms(activeOnly)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, alarms)
}

func (a *API) handleAlarmAck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/alarms/")
	parts := strings.Split(path, "/")
	if len(parts) >= 2 && parts[1] == "ack" {
		alarmID := parts[0]
		al, err := a.alarmEng.Acknowledge(alarmID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "ACK_FAILED", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, al)
		return
	}
	writeError(w, http.StatusNotFound, "NOT_FOUND", "Alarm endpoint not found")
}

func (a *API) handleAlarmReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	err := a.adapter.ResetAlarm(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "RESET_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "All alarms reset"})
}

func (a *API) handleHistory(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}
	eventType := r.URL.Query().Get("type")
	binID := r.URL.Query().Get("bin")

	events, err := a.db.GetEvents(limit, eventType, binID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (a *API) handleCommands(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}
	cmds, err := a.db.GetRecentCommands(limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, cmds)
}

func (a *API) handleMachineAuto(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	err := a.adapter.SetAutoMode(r.Context())
	if err != nil {
		writeError(w, http.StatusBadRequest, "MODE_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"machineMode": "AUTO"})
}

func (a *API) handleMachineManual(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	err := a.adapter.SetManualMode(r.Context())
	if err != nil {
		writeError(w, http.StatusBadRequest, "MODE_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"machineMode": "MANUAL"})
}

func (a *API) handleConveyorStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	user, ip := a.authMgr.ExtractUserAndIP(r)
	err := a.cmdEng.StartConveyor(r.Context(), user, ip)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CONVEYOR_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"conveyor": "RUNNING"})
}

func (a *API) handleConveyorStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	user, ip := a.authMgr.ExtractUserAndIP(r)
	err := a.cmdEng.StopConveyor(r.Context(), user, ip)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CONVEYOR_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"conveyor": "STOPPED"})
}

func (a *API) handleManualPusher(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/manual/bins/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Invalid manual action path")
		return
	}
	binID := parts[0]
	action := parts[1]
	user, ip := a.authMgr.ExtractUserAndIP(r)

	var err error
	if action == "push" {
		err = a.cmdEng.ManualPush(r.Context(), binID, user, ip)
	} else if action == "retract" {
		err = a.cmdEng.ManualRetract(r.Context(), binID, user, ip)
	} else {
		writeError(w, http.StatusBadRequest, "INVALID_ACTION", "Action must be push or retract")
		return
	}

	if err != nil {
		writeError(w, http.StatusBadRequest, "MANUAL_MOVE_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"binId": binID, "action": action, "status": "OK"})
}

func (a *API) handleModeSwitch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required")
		return
	}
	var req struct {
		Mode string `json:"mode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if len(a.cmdEng.GetActiveCommands()) > 0 {
		writeError(w, http.StatusConflict, "COMMANDS_ACTIVE", "Cannot switch mode while commands are in progress")
		return
	}

	if req.Mode == "real" {
		a.SetActiveAdapter(a.realAdapter)
		_ = a.machineSvc.SetMode("real")
		go func() {
			_ = a.realAdapter.Connect(r.Context())
		}()
	} else if req.Mode == "simulation" {
		_ = a.realAdapter.Disconnect()
		a.SetActiveAdapter(a.mockAdapter)
		_ = a.machineSvc.SetMode("simulation")
		_ = a.mockAdapter.Connect(r.Context())
	} else {
		writeError(w, http.StatusBadRequest, "INVALID_MODE", "Mode must be simulation or real")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"mode": req.Mode})
}

// Simulation Handlers
func (a *API) handleSimStart(w http.ResponseWriter, r *http.Request) {
	a.simEng.StartAutoGeneration(5 * time.Second)
	writeJSON(w, http.StatusOK, map[string]string{"simulation": "auto_started"})
}

func (a *API) handleSimStop(w http.ResponseWriter, r *http.Request) {
	a.simEng.StopAutoGeneration()
	writeJSON(w, http.StatusOK, map[string]string{"simulation": "auto_stopped"})
}

func (a *API) handleSimReset(w http.ResponseWriter, r *http.Request) {
	a.simEng.Reset()
	writeJSON(w, http.StatusOK, map[string]string{"simulation": "reset"})
}

func (a *API) handleSimRandomItem(w http.ResponseWriter, r *http.Request) {
	err := a.simEng.AddRandomItem()
	if err != nil {
		writeError(w, http.StatusBadRequest, "SIM_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "Item added to sorting line"})
}

func (a *API) handleSimItem(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProductCode string `json:"productCode"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	err := a.simEng.AddItemByProduct(req.ProductCode)
	if err != nil {
		writeError(w, http.StatusBadRequest, "SIM_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": fmt.Sprintf("Item %s queued", req.ProductCode)})
}

func (a *API) handleSimJam(w http.ResponseWriter, r *http.Request) {
	a.simEng.TriggerJam()
	writeJSON(w, http.StatusOK, map[string]string{"status": "Item jam simulated"})
}

func (a *API) handleSimDisconnect(w http.ResponseWriter, r *http.Request) {
	a.simEng.SimulateDisconnect(8 * time.Second)
	writeJSON(w, http.StatusOK, map[string]string{"status": "Simulating PLC disconnect for 8 seconds"})
}

func (a *API) handleSimSpeed(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Speed float64 `json:"speed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.Speed > 0 {
		a.simEng.SetSpeed(req.Speed)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "Speed updated"})
}
