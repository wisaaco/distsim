package handler

import (
	"bufio"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/docker/docker/pkg/stdcopy"
	"github.com/go-chi/chi/v5"
)

// logMessage is a single log line sent over the WebSocket to the client.
type logMessage struct {
	Type      string `json:"type"`
	Data      string `json:"data"`
	Stream    string `json:"stream"`
	Timestamp string `json:"timestamp"`
}

// StreamLogs handles GET /api/sessions/{id}/machines/{mid}/logs.
// It upgrades the HTTP connection to a WebSocket and streams container
// logs (stdout + stderr) as JSON messages until the client disconnects.
func (h *Handler) StreamLogs(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

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
		slog.Error("logs ws upgrade failed", "session", sessionID, "machine", machineID, "error", err)
		return
	}
	defer conn.Close()

	// Start following container logs.
	ctx := r.Context()
	logReader, err := h.docker.ContainerLogs(ctx, containerID, true)
	if err != nil {
		slog.Error("failed to get container logs", "container", containerID, "error", err)
		conn.WriteJSON(logMessage{Type: "error", Data: "failed to stream logs: " + err.Error()})
		return
	}
	defer logReader.Close()

	// Docker multiplexes stdout/stderr in non-TTY mode using an 8-byte header.
	// Use stdcopy to demultiplex into separate stdout/stderr pipes.
	stdoutPR, stdoutPW := io.Pipe()
	stderrPR, stderrPW := io.Pipe()

	// Detect WebSocket client disconnect.
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	// Demux Docker log stream in a goroutine.
	go func() {
		defer stdoutPW.Close()
		defer stderrPW.Close()
		stdcopy.StdCopy(stdoutPW, stderrPW, logReader)
	}()

	// Stream stdout lines in a goroutine.
	go func() {
		streamLines(conn, stdoutPR, "stdout")
	}()

	// Stream stderr lines in a goroutine.
	go func() {
		streamLines(conn, stderrPR, "stderr")
	}()

	// Block until the client disconnects.
	<-done

	slog.Info("log stream closed", "session", sessionID, "machine", machineID)
}

// streamLines reads lines from r and sends them as logMessage JSON over the WebSocket.
func streamLines(conn wsConn, r io.Reader, stream string) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		ts, data := splitTimestamp(line)
		msg := logMessage{
			Type:      "log",
			Data:      data,
			Stream:    stream,
			Timestamp: ts,
		}
		if err := conn.WriteJSON(msg); err != nil {
			return
		}
	}
}

// wsConn is the subset of websocket.Conn we need for writing JSON.
type wsConn interface {
	WriteJSON(v any) error
}

// splitTimestamp separates a Docker log line's RFC3339 timestamp prefix
// from the log data. Docker prepends timestamps when Timestamps: true is set.
// If no valid timestamp is found, returns the current time and the full line.
func splitTimestamp(line string) (string, string) {
	if len(line) > 30 {
		spaceIdx := strings.IndexByte(line, ' ')
		if spaceIdx > 0 && spaceIdx < 40 {
			ts := line[:spaceIdx]
			if _, err := time.Parse(time.RFC3339Nano, ts); err == nil {
				return ts, line[spaceIdx+1:]
			}
		}
	}
	return time.Now().UTC().Format(time.RFC3339Nano), line
}
