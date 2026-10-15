package server

import (
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"warehouse-hmi/internal/api"
	"warehouse-hmi/internal/config"
)

type Server struct {
	cfg      *config.Config
	api      *api.API
	distFS   fs.FS
	httpSrv  *http.Server
}

func NewServer(cfg *config.Config, apiInstance *api.API, embeddedFS fs.FS) *Server {
	return &Server{
		cfg:    cfg,
		api:    apiInstance,
		distFS: embeddedFS,
	}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Register API and WebSocket routes
	s.api.RegisterRoutes(mux)

	// Static SPA file handler with fallback
	fileHandler := s.createSPAHandler()
	mux.Handle("/", fileHandler)

	addr := fmt.Sprintf("%s:%d", s.cfg.ServerHost, s.cfg.ServerPort)
	s.httpSrv = &http.Server{
		Addr:         addr,
		Handler:      s.corsAndLogMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("==========================================================")
	log.Printf("🏭 WAREHOUSE AUTOMATION HMI & DISPENSING SYSTEM")
	log.Printf("   Mode:            %s", strings.ToUpper(s.cfg.PLCMode))
	log.Printf("   Listening on:    http://%s:%d (0.0.0.0 enables LAN/WiFi)", s.cfg.ServerHost, s.cfg.ServerPort)
	log.Printf("   Real PLC Writes: %v (SAFETY INTERLOCK)", s.cfg.EnableRealPLCWrites)
	log.Printf("==========================================================")

	return s.httpSrv.ListenAndServe()
}

func (s *Server) Close() error {
	if s.httpSrv != nil {
		return s.httpSrv.Close()
	}
	return nil
}

func (s *Server) corsAndLogMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow CORS for LAN, local dev Vite, and mobile devices
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		start := time.Now()
		next.ServeHTTP(w, r)

		// Don't spam console with cyclic polling or websocket keepalives
		if !strings.HasPrefix(r.URL.Path, "/ws") && !strings.HasPrefix(r.URL.Path, "/api/status") {
			if s.cfg.LogLevel == "debug" || strings.HasPrefix(r.URL.Path, "/api/") {
				log.Printf("[%s] %s %s (%v)", r.Method, r.URL.Path, r.RemoteAddr, time.Since(start))
			}
		}
	})
}

func (s *Server) createSPAHandler() http.Handler {
	// First check local dist directories (useful during dev or release folder)
	localDistPaths := []string{
		"../frontend/dist",
		"../../frontend/dist",
		"frontend/dist",
		"./dist",
	}

	for _, p := range localDistPaths {
		if stat, err := os.Stat(p); err == nil && stat.IsDir() {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				path := filepath.Join(p, filepath.Clean(r.URL.Path))
				if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
					http.ServeFile(w, r, path)
					return
				}
				// Fallback to index.html for client-side routing
				http.ServeFile(w, r, filepath.Join(p, "index.html"))
			})
		}
	}

	// If embedded FS provided
	if s.distFS != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(filepath.Clean(r.URL.Path), "/")
			if path == "" || path == "." {
				path = "index.html"
			}
			f, err := s.distFS.Open(path)
			if err == nil {
				_ = f.Close()
				http.FileServer(http.FS(s.distFS)).ServeHTTP(w, r)
				return
			}
			// Fallback to index.html
			indexFile, err := s.distFS.Open("index.html")
			if err == nil {
				defer indexFile.Close()
				stat, _ := indexFile.Stat()
				http.ServeContent(w, r, "index.html", stat.ModTime(), indexFile.(io.ReadSeeker))
				return
			}
			http.NotFound(w, r)
		})
	}

	// Placeholder if frontend hasn't been built yet
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>Warehouse HMI - API Active</title></head>
<body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
	<h1>🏭 Warehouse Sorting & Dispensing HMI Server</h1>
	<p>Backend API & WebSocket server is RUNNING on port ` + fmt.Sprintf("%d", s.cfg.ServerPort) + `.</p>
	<p>Frontend web app is building or available on Vite dev server (http://localhost:5173).</p>
	<p><a href="/api/health" style="color: #38bdf8;">View /api/health</a> | <a href="/api/status" style="color: #38bdf8;">View /api/status</a></p>
</body>
</html>`))
	})
}
