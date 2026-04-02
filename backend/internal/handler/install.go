package handler

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/hamidlabs/distsim/internal/domain"
)

// InstallService handles POST /api/sessions/{id}/machines/{mid}/services/{sid}/install.
// It installs and starts the service software inside the machine's container.
// This is a potentially long-running operation (apt-get install).
func (h *Handler) InstallService(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")
	serviceID := chi.URLParam(r, "sid")
	ctx := r.Context()

	// Look up session, machine, and service.
	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var containerID string
	var svcType domain.ServiceType
	for _, m := range sess.Machines {
		if m.ID == machineID {
			containerID = m.ContainerID
			for _, svc := range m.Services {
				if svc.ID == serviceID {
					svcType = svc.Type
					break
				}
			}
			break
		}
	}

	if containerID == "" {
		writeError(w, http.StatusNotFound, "machine not found")
		return
	}
	if svcType == "" {
		writeError(w, http.StatusNotFound, "service not found")
		return
	}

	// Mark as installing.
	if err := h.store.UpdateServiceStatus(sessionID, machineID, serviceID, "installing", false); err != nil {
		slog.Error("failed to update service status", "error", err)
	}

	// Run install commands.
	slog.Info("installing service", "type", svcType, "machine", machineID, "container", containerID[:12])

	if err := h.docker.InstallService(ctx, containerID, svcType); err != nil {
		slog.Error("service install failed", "type", svcType, "error", err)
		h.store.UpdateServiceStatus(sessionID, machineID, serviceID, "error", false)
		writeError(w, http.StatusInternalServerError, "install failed: "+err.Error())
		return
	}

	// Mark as installed and running.
	if err := h.store.UpdateServiceStatus(sessionID, machineID, serviceID, "running", true); err != nil {
		slog.Error("failed to update service status", "error", err)
	}

	slog.Info("service installed", "type", svcType, "machine", machineID)
	writeJSON(w, http.StatusOK, map[string]any{
		"id":        serviceID,
		"type":      svcType,
		"status":    "running",
		"installed": true,
	})
}
