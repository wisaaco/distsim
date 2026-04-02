package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/hamidlabs/distsim/internal/docker"
	"github.com/hamidlabs/distsim/internal/domain"
)

// addMachineRequest is the expected JSON body for POST /api/sessions/{id}/machines.
type addMachineRequest struct {
	Hostname string `json:"hostname"`
	Image    string `json:"image"`
}

// ListMachines handles GET /api/sessions/{id}/machines.
// It returns all machines belonging to the given session.
func (h *Handler) ListMachines(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sess, err := h.store.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sess.Machines)
}

// AddMachine handles POST /api/sessions/{id}/machines.
// It creates a new container in the session's Docker network and registers
// it as a machine in the session store.
func (h *Handler) AddMachine(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	ctx := r.Context()

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var req addMachineRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Hostname == "" {
		writeError(w, http.StatusBadRequest, "hostname is required")
		return
	}
	if req.Image == "" {
		req.Image = "distsim-base:latest"
	}

	// Create the container name with a session prefix to avoid collisions.
	containerName := fmt.Sprintf("ds-%s-%s", req.Hostname, sessionID[:8])

	info, err := h.docker.CreateContainer(ctx, docker.ContainerOpts{
		Hostname:     containerName,
		Image:        req.Image,
		NetworkID:    sess.NetworkID,
		NetworkAlias: req.Hostname,
	})
	if err != nil {
		slog.Error("failed to create machine", "hostname", req.Hostname, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create machine")
		return
	}

	// Auto-add api_tester service for client machines.
	services := []domain.ServiceInst{}
	if req.Hostname == "client" {
		services = append(services, domain.ServiceInst{
			ID:        uuid.New().String(),
			Type:      domain.ServiceAPITester,
			Status:    "running",
			Installed: true,
		})
	}

	machine := domain.Machine{
		ID:          uuid.New().String(),
		Hostname:    req.Hostname,
		IP:          info.IP,
		ContainerID: info.ID,
		Image:       req.Image,
		Status:      "running",
		Services:    services,
		SessionID:   sessionID,
	}

	if err := h.store.AddMachine(sessionID, machine); err != nil {
		slog.Error("failed to register machine in store", "error", err)
		writeError(w, http.StatusInternalServerError, "machine created but failed to register")
		return
	}

	slog.Info("machine added", "session", sessionID, "hostname", req.Hostname, "ip", info.IP)
	writeJSON(w, http.StatusCreated, machine)
}

// updatePositionRequest is the expected JSON body for PUT /api/sessions/{id}/machines/{mid}/position.
// Accepts both {"x","y"} and {"position_x","position_y"} for frontend compatibility.
type updatePositionRequest struct {
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	PositionX float64 `json:"position_x"`
	PositionY float64 `json:"position_y"`
}

// resolvedX returns the X position from whichever field was provided.
func (r *updatePositionRequest) resolvedX() float64 {
	if r.X != 0 {
		return r.X
	}
	return r.PositionX
}

// resolvedY returns the Y position from whichever field was provided.
func (r *updatePositionRequest) resolvedY() float64 {
	if r.Y != 0 {
		return r.Y
	}
	return r.PositionY
}

// UpdateMachinePosition handles PUT /api/sessions/{id}/machines/{mid}/position.
// It updates the canvas position of a machine, typically called when the user
// drags a node on the frontend.
func (h *Handler) UpdateMachinePosition(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	var req updatePositionRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	x, y := req.resolvedX(), req.resolvedY()

	if err := h.store.UpdateMachinePosition(sessionID, machineID, x, y); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	slog.Info("machine position updated", "session", sessionID, "machine", machineID, "x", x, "y", y)
	writeJSON(w, http.StatusOK, map[string]any{
		"id": machineID,
		"x":  x,
		"y":  y,
	})
}

// DeleteMachine handles DELETE /api/sessions/{id}/machines/{mid}.
// It stops and removes the container, removes all connections involving this
// machine, and removes it from the session store.
func (h *Handler) DeleteMachine(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")
	ctx := r.Context()

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Find the machine.
	var containerID, hostname string
	for _, m := range sess.Machines {
		if m.ID == machineID {
			containerID = m.ContainerID
			hostname = m.Hostname
			break
		}
	}
	if containerID == "" {
		writeError(w, http.StatusNotFound, fmt.Sprintf("machine %q not found", machineID))
		return
	}

	// Remove all connections involving this machine.
	connections, _ := h.store.ListConnections(sessionID)
	for _, conn := range connections {
		if conn.FromNode == machineID || conn.ToNode == machineID {
			h.store.RemoveConnection(sessionID, conn.ID)
		}
	}

	// Stop and remove the Docker container.
	if err := h.docker.RemoveContainer(ctx, containerID); err != nil {
		slog.Error("failed to remove container", "container", containerID[:12], "error", err)
	}

	// Remove from store.
	if err := h.store.RemoveMachine(sessionID, machineID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	slog.Info("machine deleted", "session", sessionID, "hostname", hostname, "machine", machineID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": machineID})
}
