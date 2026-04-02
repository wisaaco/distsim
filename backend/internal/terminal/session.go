// Package terminal provides a WebSocket-to-Docker-exec bridge, allowing
// frontend users to open interactive shell sessions inside containers.
package terminal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"sync"

	"github.com/gorilla/websocket"

	"github.com/hamidlabs/distsim/internal/docker"
)

// inputMessage is a JSON message from the WebSocket client carrying terminal input.
type inputMessage struct {
	Type string `json:"type"` // "input" or "resize"
	Data string `json:"data"` // terminal input bytes (for "input")
	Rows uint   `json:"rows"` // TTY rows (for "resize")
	Cols uint   `json:"cols"` // TTY cols (for "resize")
}

// outputMessage is a JSON message sent to the WebSocket client with terminal output.
type outputMessage struct {
	Type string `json:"type"` // "output"
	Data string `json:"data"` // raw terminal output
}

// Session bridges a single WebSocket connection to a Docker exec process,
// providing an interactive shell inside a container.
type Session struct {
	// ID is a unique identifier for this terminal session.
	ID string
	// ContainerID is the Docker container this session is attached to.
	ContainerID string
	// ExecID is the Docker exec instance ID.
	ExecID string

	conn     *websocket.Conn
	hijacked docker.HijackedResponse
	docker   *docker.Client
	done     chan struct{}
	once     sync.Once
}

// NewSession creates a terminal session by setting up a Docker exec inside the
// specified container and associating it with the given WebSocket connection.
func NewSession(id, containerID string, conn *websocket.Conn, dockerClient *docker.Client) (*Session, error) {
	ctx := context.Background()

	// Create exec: interactive bash shell with TTY.
	execID, err := dockerClient.ExecCreate(ctx, containerID, []string{"/bin/bash"})
	if err != nil {
		// Fall back to /bin/sh if bash is not available.
		execID, err = dockerClient.ExecCreate(ctx, containerID, []string{"/bin/sh"})
		if err != nil {
			return nil, fmt.Errorf("creating exec in container %q: %w", containerID, err)
		}
	}

	// Attach to the exec to get a bidirectional stream.
	hijacked, err := dockerClient.ExecAttach(ctx, execID)
	if err != nil {
		return nil, fmt.Errorf("attaching to exec %q: %w", execID, err)
	}

	return &Session{
		ID:          id,
		ContainerID: containerID,
		ExecID:      execID,
		conn:        conn,
		hijacked:    hijacked,
		docker:      dockerClient,
		done:        make(chan struct{}),
	}, nil
}

// Start runs the bidirectional pipe between the WebSocket and the Docker exec.
// It blocks until the session is closed (either side disconnects).
func (s *Session) Start(ctx context.Context) error {
	// ws -> exec: read JSON messages from WebSocket, write to exec stdin.
	go s.readFromWS()

	// exec -> ws: read from exec stdout, write JSON messages to WebSocket.
	go s.readFromExec()

	// Block until done or context cancelled.
	select {
	case <-s.done:
	case <-ctx.Done():
	}

	s.Close()
	return nil
}

// Resize changes the TTY dimensions of the exec process.
func (s *Session) Resize(rows, cols uint) error {
	return s.docker.ExecResize(context.Background(), s.ExecID, rows, cols)
}

// Close shuts down both sides of the bridge and releases resources.
func (s *Session) Close() error {
	s.once.Do(func() {
		close(s.done)
		s.hijacked.Close()
		s.conn.Close()
	})
	return nil
}

// readFromWS reads messages from the WebSocket and forwards them to the exec stdin.
func (s *Session) readFromWS() {
	defer s.Close()

	for {
		_, raw, err := s.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Warn("terminal ws read error", "session", s.ID, "error", err)
			}
			return
		}

		var msg inputMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			slog.Warn("terminal invalid ws message", "session", s.ID, "error", err)
			continue
		}

		switch msg.Type {
		case "input":
			if _, err := s.hijacked.Conn.Write([]byte(msg.Data)); err != nil {
				slog.Warn("terminal exec write error", "session", s.ID, "error", err)
				return
			}
		case "resize":
			if msg.Rows > 0 && msg.Cols > 0 {
				if err := s.Resize(msg.Rows, msg.Cols); err != nil {
					slog.Warn("terminal resize error", "session", s.ID, "error", err)
				}
			}
		default:
			slog.Warn("terminal unknown message type", "session", s.ID, "type", msg.Type)
		}
	}
}

// readFromExec reads output from the exec process and forwards it to the WebSocket.
func (s *Session) readFromExec() {
	defer s.Close()

	buf := make([]byte, 4096)
	for {
		n, err := s.hijacked.Reader.Read(buf)
		if n > 0 {
			msg := outputMessage{
				Type: "output",
				Data: string(buf[:n]),
			}
			if werr := s.conn.WriteJSON(msg); werr != nil {
				slog.Warn("terminal ws write error", "session", s.ID, "error", werr)
				return
			}
		}
		if err != nil {
			if err != io.EOF {
				slog.Warn("terminal exec read error", "session", s.ID, "error", err)
			}
			return
		}
	}
}
