package terminal

import (
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/hamidlabs/distsim/internal/docker"
)

// Manager tracks active terminal sessions and provides lifecycle management.
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*Session // key: session ID
	docker   *docker.Client
}

// NewManager creates a terminal session manager backed by the given Docker client.
func NewManager(docker *docker.Client) *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
		docker:   docker,
	}
}

// Create creates a new terminal session for the specified container and
// WebSocket connection. The session is registered in the manager and ready
// to be started.
func (m *Manager) Create(containerID string, conn *websocket.Conn) (*Session, error) {
	id := uuid.New().String()

	sess, err := NewSession(id, containerID, conn, m.docker)
	if err != nil {
		return nil, fmt.Errorf("creating terminal session: %w", err)
	}

	m.mu.Lock()
	m.sessions[id] = sess
	m.mu.Unlock()

	slog.Info("terminal session created", "id", id, "container", containerID)
	return sess, nil
}

// Get returns a terminal session by ID, or an error if not found.
func (m *Manager) Get(id string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sess, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("terminal session %q not found", id)
	}
	return sess, nil
}

// Close terminates and removes a single terminal session.
func (m *Manager) Close(id string) error {
	m.mu.Lock()
	sess, ok := m.sessions[id]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("terminal session %q not found", id)
	}
	delete(m.sessions, id)
	m.mu.Unlock()

	sess.Close()
	slog.Info("terminal session closed", "id", id)
	return nil
}

// Remove removes a session from the manager without closing it.
// This is called after the session has already closed itself.
func (m *Manager) Remove(id string) {
	m.mu.Lock()
	delete(m.sessions, id)
	m.mu.Unlock()
}

// CloseAll terminates all active terminal sessions. Called during graceful shutdown.
func (m *Manager) CloseAll() {
	m.mu.Lock()
	sessions := make(map[string]*Session, len(m.sessions))
	for k, v := range m.sessions {
		sessions[k] = v
	}
	m.sessions = make(map[string]*Session)
	m.mu.Unlock()

	for id, sess := range sessions {
		sess.Close()
		slog.Info("terminal session closed (shutdown)", "id", id)
	}

	slog.Info("all terminal sessions closed", "count", len(sessions))
}
