package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"warehouse-hmi/internal/models"
)

const (
	writeWait      = 5 * time.Second
	pongWait       = 10 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow any origin for LAN/WiFi access (PC, tablets, mobile)
		return true
	},
}

type Message struct {
	Event   string      `json:"event"`
	Payload interface{} `json:"payload"`
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

type SnapshotProvider interface {
	GetSnapshot() models.SystemSnapshot
}

type Hub struct {
	mu               sync.RWMutex
	clients          map[*Client]bool
	broadcastChan    chan []byte
	registerChan     chan *Client
	unregisterChan   chan *Client
	snapshotProvider SnapshotProvider
	startTime        time.Time
}

func NewHub(provider SnapshotProvider) *Hub {
	return &Hub{
		clients:          make(map[*Client]bool),
		broadcastChan:    make(chan []byte, 256),
		registerChan:     make(chan *Client),
		unregisterChan:   make(chan *Client),
		snapshotProvider: provider,
		startTime:        time.Now().UTC(),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.registerChan:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Immediately send snapshot to new client
			if h.snapshotProvider != nil {
				snap := h.snapshotProvider.GetSnapshot()
				msg := Message{Event: "snapshot", Payload: snap}
				if data, err := json.Marshal(msg); err == nil {
					client.send <- data
				}
			}

		case client := <-h.unregisterChan:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcastChan:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(event string, payload interface{}) {
	msg := Message{Event: event, Payload: payload}
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[WebSocket] marshal error for event %s: %v", event, err)
		return
	}
	h.broadcastChan <- data
}

func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WebSocket] Upgrade error: %v", err)
		return
	}

	client := &Client{hub: h, conn: conn, send: make(chan []byte, 128)}
	h.registerChan <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregisterChan <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Drain queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
