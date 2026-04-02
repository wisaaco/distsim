package handler

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

// wsUpgrader handles HTTP-to-WebSocket upgrades for terminal connections.
var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// Allow connections from the frontend dev server and localhost.
		return origin == "" ||
			origin == "http://localhost:3000" ||
			origin == "http://localhost:5173" ||
			origin == "http://127.0.0.1:3000" ||
			origin == "http://127.0.0.1:5173"
	},
}

// Terminal handles GET /api/sessions/{id}/machines/{mid}/terminal.
// It upgrades the HTTP connection to a WebSocket and bridges it to an
// interactive shell inside the machine's Docker container.
func (h *Handler) Terminal(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	if h.terminal == nil {
		writeError(w, http.StatusServiceUnavailable, "terminal manager not available")
		return
	}

	// Look up the session and machine to find the container ID.
	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var containerID string
	for _, m := range sess.Machines {
		if m.ID == machineID {
			containerID = m.ContainerID
			break
		}
	}
	if containerID == "" {
		writeError(w, http.StatusNotFound, "machine not found in session")
		return
	}

	// Upgrade HTTP to WebSocket.
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("terminal ws upgrade failed", "session", sessionID, "machine", machineID, "error", err)
		// Upgrade already wrote the HTTP error response.
		return
	}

	// Create a terminal session bridging the WebSocket to Docker exec.
	termSess, err := h.terminal.Create(containerID, conn)
	if err != nil {
		slog.Error("terminal session creation failed", "session", sessionID, "machine", machineID, "error", err)
		conn.WriteJSON(map[string]string{"type": "error", "data": "failed to create terminal session"})
		conn.Close()
		return
	}

	slog.Info("terminal session started",
		"terminal", termSess.ID,
		"session", sessionID,
		"machine", machineID,
		"container", containerID,
	)

	// Start blocks until the session closes.
	if err := termSess.Start(r.Context()); err != nil {
		slog.Warn("terminal session error", "terminal", termSess.ID, "error", err)
	}

	// Clean up the session from the manager after it ends.
	h.terminal.Remove(termSess.ID)

	slog.Info("terminal session ended", "terminal", termSess.ID, "session", sessionID, "machine", machineID)
}
