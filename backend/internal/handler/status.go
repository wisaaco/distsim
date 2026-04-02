package handler

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/hamidlabs/distsim/internal/domain"
)

// serviceStatus represents the health of a single service on a machine.
type serviceStatus struct {
	Type    domain.ServiceType `json:"type"`
	Healthy bool               `json:"healthy"`
}

// machineStatusResponse represents the health status of a single machine
// including its container state and service health.
type machineStatusResponse struct {
	MachineID        string          `json:"machine_id"`
	Hostname         string          `json:"hostname"`
	ContainerRunning bool            `json:"container_running"`
	ContainerStatus  string          `json:"container_status"`
	Services         []serviceStatus `json:"services"`
}

// SessionStatus handles GET /api/sessions/{id}/status.
// It returns the health status of all machines in the session by inspecting
// each machine's Docker container state and reporting service liveness.
func (h *Handler) SessionStatus(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	ctx := r.Context()

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	statuses := make([]machineStatusResponse, 0, len(sess.Machines))
	for _, m := range sess.Machines {
		status := machineStatusResponse{
			MachineID:        m.ID,
			Hostname:         m.Hostname,
			ContainerRunning: false,
			ContainerStatus:  "unknown",
			Services:         make([]serviceStatus, 0, len(m.Services)),
		}

		state, err := h.docker.InspectContainer(ctx, m.ContainerID)
		if err != nil {
			slog.Warn("failed to inspect container",
				"container", m.ContainerID,
				"hostname", m.Hostname,
				"error", err,
			)
		} else {
			status.ContainerRunning = state.Running
			status.ContainerStatus = state.Status
		}

		// Report service health: a service is healthy if its container is running.
		// For more granular checks, individual service probes could be added later.
		for _, svc := range m.Services {
			status.Services = append(status.Services, serviceStatus{
				Type:    svc.Type,
				Healthy: status.ContainerRunning,
			})
		}

		statuses = append(statuses, status)
	}

	writeJSON(w, http.StatusOK, statuses)
}
