package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"warehouse-hmi/internal/alarm"
	"warehouse-hmi/internal/api"
	"warehouse-hmi/internal/auth"
	"warehouse-hmi/internal/command"
	"warehouse-hmi/internal/config"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/inventory"
	"warehouse-hmi/internal/machine"
	"warehouse-hmi/internal/models"
	"warehouse-hmi/internal/plc/driver/modbus"
	"warehouse-hmi/internal/plc/mock"
	"warehouse-hmi/internal/plc/real"
	"warehouse-hmi/internal/server"
	"warehouse-hmi/internal/simulation"
	"warehouse-hmi/internal/websocket"
)

func main() {
	envFile := flag.String("env", ".env", "Path to .env configuration file")
	plcMapFile := flag.String("plc-map", "configs/plc-map.yaml", "Path to plc-map.yaml file")
	flag.Parse()

	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.Println("Starting Industrial Warehouse HMI Server...")

	// 1. Load configuration
	cfg, err := config.LoadConfig(*envFile, *plcMapFile)
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	// 2. Initialize Database
	db, err := database.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to open database at %s: %v", cfg.DatabasePath, err)
	}
	defer db.Close()

	if err := db.SeedDefaultUsers(cfg.AdminDefaultPassword, cfg.OperatorDefaultPassword); err != nil {
		log.Printf("Warning: failed to seed default accounts: %v", err)
	}

	// 3. Auth Manager
	authMgr := auth.NewManager(db, cfg.AuthEnabled)

	// 4. Initialize Core Domain Services
	// Temporary nil broadcast, will be linked to WebSocket Hub
	alarmEng := alarm.NewEngine(db, nil)

	machineSvc := machine.NewService(cfg, alarmEng, nil)

	invSvc, err := inventory.NewService(cfg, db, nil)
	if err != nil {
		log.Fatalf("Failed to initialize inventory service: %v", err)
	}

	simEng := simulation.NewEngine(cfg, machineSvc, invSvc, alarmEng)

	// 5. Initialize PLC Adapters
	mockAdapter := mock.NewMockPLCAdapter(simEng, machineSvc, invSvc, alarmEng)

	modbusDriver := modbus.NewModbusTCPDriver(cfg.PLCHost, cfg.PLCPort, cfg.PLCUnitID)
	realAdapter := real.NewRealPLCAdapter(cfg, modbusDriver, machineSvc, invSvc, alarmEng)

	// 6. Command Engine
	cmdEng := command.NewEngine(db, mockAdapter, machineSvc, invSvc, alarmEng, nil)

	// 7. WebSocket Hub & Snapshot Provider
	var apiInstance *api.API
	hub := websocket.NewHub(nil) // Provider linked after apiInstance created
	go hub.Run()

	apiInstance = api.NewAPI(
		cfg, db, hub, machineSvc, invSvc, cmdEng, alarmEng, simEng, authMgr,
		mockAdapter, realAdapter,
	)
	hub = websocket.NewHub(apiInstance)
	go hub.Run()

	// 8. Wire Realtime Broadcast Callbacks to WebSocket
	broadcastFn := func(event string, payload interface{}) {
		hub.Broadcast(event, payload)
	}

	machineSvc.SetBroadcast(broadcastFn)
	cmdEng.SetBroadcast(broadcastFn)
	alarmEng.SetOnChangeHandler(func(a models.Alarm, action string) {
		hub.Broadcast(action, a)
		hub.Broadcast("machine_state", machineSvc.GetStatus())
	})
	invSvc.SetOnUpdateHandler(func(b models.Bin) {
		hub.Broadcast("bin_updated", b)
		hub.Broadcast("inventory_updated", invSvc.GetBins())
	})

	// 9. Select Mode and Connect
	if cfg.PLCMode == "real" {
		log.Printf("Connecting to Real PLC at %s:%d via Modbus TCP...", cfg.PLCHost, cfg.PLCPort)
		apiInstance.SetActiveAdapter(realAdapter)
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := realAdapter.Connect(ctx); err != nil {
				log.Printf("Note: Real PLC not immediately reachable: %v. Running in RECONNECTING mode.", err)
			}
		}()
	} else {
		log.Println("Starting in SIMULATION MODE. Virtual plant is active.")
		apiInstance.SetActiveAdapter(mockAdapter)
		_ = mockAdapter.Connect(context.Background())
	}

	// 10. Start HTTP Server
	srv := server.NewServer(cfg, apiInstance, nil)
	go func() {
		if err := srv.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// 11. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server gracefully...")
	_ = srv.Close()
	_ = realAdapter.Disconnect()
	simEng.StopAutoGeneration()
	log.Println("Server terminated cleanly.")
}
