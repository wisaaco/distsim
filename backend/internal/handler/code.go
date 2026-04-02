package handler

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/hamidlabs/distsim/internal/domain"
)

// writeFileRequest is the expected JSON body for PUT /api/sessions/{id}/machines/{mid}/files.
type writeFileRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// execCommandRequest is the expected JSON body for POST /api/sessions/{id}/machines/{mid}/exec.
type execCommandRequest struct {
	Command string `json:"command"`
}

// execCommandResponse is returned by the exec endpoint.
type execCommandResponse struct {
	Output   string `json:"output"`
	ExitCode int    `json:"exit_code"`
}

// ReadFile handles GET /api/sessions/{id}/machines/{mid}/files?path=/home/distsim/app/main.go.
// It reads a file from inside the machine's container and returns its content.
func (h *Handler) ReadFile(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")
	filePath := r.URL.Query().Get("path")

	if filePath == "" {
		writeError(w, http.StatusBadRequest, "path query parameter is required")
		return
	}

	// Validate the path is absolute to prevent directory traversal.
	if !strings.HasPrefix(filePath, "/") {
		writeError(w, http.StatusBadRequest, "path must be absolute")
		return
	}

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Find the machine and get its container ID.
	containerID, err := h.findContainerID(sess, machineID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	content, err := h.docker.ReadFile(r.Context(), containerID, filePath)
	if err != nil {
		slog.Error("failed to read file from container",
			"session", sessionID,
			"machine", machineID,
			"path", filePath,
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to read file: %v", err))
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"path":    filePath,
		"content": content,
	})
}

// WriteFile handles PUT /api/sessions/{id}/machines/{mid}/files.
// It writes a file into the machine's container at the specified path.
func (h *Handler) WriteFile(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	var req writeFileRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Path == "" {
		writeError(w, http.StatusBadRequest, "path is required")
		return
	}
	if !strings.HasPrefix(req.Path, "/") {
		writeError(w, http.StatusBadRequest, "path must be absolute")
		return
	}

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	containerID, err := h.findContainerID(sess, machineID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := h.docker.WriteFile(r.Context(), containerID, req.Path, req.Content); err != nil {
		slog.Error("failed to write file to container",
			"session", sessionID,
			"machine", machineID,
			"path", req.Path,
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to write file: %v", err))
		return
	}

	slog.Info("file written",
		"session", sessionID,
		"machine", machineID,
		"path", req.Path,
		"size", len(req.Content),
	)
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "written",
		"path":   req.Path,
	})
}

// ExecCommand handles POST /api/sessions/{id}/machines/{mid}/exec.
// It executes a shell command inside the machine's container and returns
// the combined stdout+stderr output along with the exit code.
func (h *Handler) ExecCommand(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	var req execCommandRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Command == "" {
		writeError(w, http.StatusBadRequest, "command is required")
		return
	}

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	containerID, err := h.findContainerID(sess, machineID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	output, exitCode, err := h.docker.ExecCommand(r.Context(), containerID, []string{"sh", "-c", req.Command})
	if err != nil {
		slog.Error("failed to execute command in container",
			"session", sessionID,
			"machine", machineID,
			"command", req.Command,
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to execute command: %v", err))
		return
	}

	slog.Info("command executed",
		"session", sessionID,
		"machine", machineID,
		"command", req.Command,
		"exit_code", exitCode,
	)
	writeJSON(w, http.StatusOK, execCommandResponse{
		Output:   output,
		ExitCode: exitCode,
	})
}

// ExecDetached handles POST /api/sessions/{id}/machines/{mid}/exec-detached.
// It starts a command inside the container without waiting for it to finish.
// Used for starting long-running services like node/python/go servers.
func (h *Handler) ExecDetached(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	var req execCommandRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Command == "" {
		writeError(w, http.StatusBadRequest, "command is required")
		return
	}

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	containerID, err := h.findContainerID(sess, machineID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := h.docker.ExecDetached(r.Context(), containerID, []string{"sh", "-c", req.Command}); err != nil {
		slog.Error("failed to exec detached", "session", sessionID, "machine", machineID, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to start: "+err.Error())
		return
	}

	slog.Info("detached command started", "session", sessionID, "machine", machineID, "command", req.Command[:min(len(req.Command), 80)])
	writeJSON(w, http.StatusOK, map[string]string{"status": "started"})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// findContainerID looks up the Docker container ID for a machine within a session.
// Returns an error if the machine is not found.
func (h *Handler) findContainerID(sess *domain.Session, machineID string) (string, error) {
	for _, m := range sess.Machines {
		if m.ID == machineID {
			return m.ContainerID, nil
		}
	}
	return "", fmt.Errorf("machine %q not found in session %q", machineID, sess.ID)
}
