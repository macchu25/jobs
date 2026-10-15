package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
	"warehouse-hmi/internal/database"
	"warehouse-hmi/internal/models"
)

type Session struct {
	Token     string
	User      models.User
	CreatedAt time.Time
	ExpiresAt time.Time
}

type Manager struct {
	mu          sync.RWMutex
	db          *database.DB
	authEnabled bool
	sessions    map[string]*Session
}

func NewManager(db *database.DB, authEnabled bool) *Manager {
	return &Manager{
		db:          db,
		authEnabled: authEnabled,
		sessions:    make(map[string]*Session),
	}
}

func (m *Manager) IsAuthEnabled() bool {
	return m.authEnabled
}

func (m *Manager) Login(username, password string) (*Session, error) {
	if !m.authEnabled {
		// Mock admin session if auth disabled
		return &Session{
			Token: "mock-session-token",
			User: models.User{
				ID:       "admin-guest",
				Username: "admin",
				Role:     "ADMIN",
			},
			CreatedAt: time.Now().UTC(),
			ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
		}, nil
	}

	user, err := m.db.GetUserByUsername(username)
	if err != nil || user == nil {
		return nil, fmt.Errorf("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid username or password")
	}

	tokenBytes := make([]byte, 32)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	sess := &Session{
		Token:     token,
		User:      *user,
		CreatedAt: time.Now().UTC(),
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
	}

	m.mu.Lock()
	m.sessions[token] = sess
	m.mu.Unlock()

	return sess, nil
}

func (m *Manager) Logout(token string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, token)
}

func (m *Manager) ValidateToken(token string) (*Session, error) {
	if !m.authEnabled {
		return &Session{
			Token: "mock-session-token",
			User: models.User{
				Username: "operator",
				Role:     "ADMIN",
			},
		}, nil
	}

	m.mu.RLock()
	sess, ok := m.sessions[token]
	m.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("invalid or expired session")
	}

	if time.Now().UTC().After(sess.ExpiresAt) {
		m.Logout(token)
		return nil, fmt.Errorf("session expired")
	}

	return sess, nil
}

func (m *Manager) ExtractUserAndIP(r *http.Request) (string, string) {
	ip := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ip = strings.Split(forwarded, ",")[0]
	}

	user := "anonymous"
	if !m.authEnabled {
		return "operator", ip
	}

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if sess, err := m.ValidateToken(token); err == nil {
			return sess.User.Username, ip
		}
	}

	return user, ip
}
