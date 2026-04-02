package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/hamidlabs/distsim/internal/domain"
)

// addServiceRequest is the expected JSON body for POST /api/sessions/{id}/machines/{mid}/services.
type addServiceRequest struct {
	Type string `json:"type"`
}

// ListServiceDefs handles GET /api/services.
// It returns the full service registry so the frontend can populate its toolbar
// and know what each service type exposes and consumes.
func (h *Handler) ListServiceDefs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, domain.ServiceRegistry)
}

// AddService handles POST /api/sessions/{id}/machines/{mid}/services.
// It validates that the service type exists in the registry and appends a new
// ServiceInst to the machine's service list.
func (h *Handler) AddService(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")

	var req addServiceRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Type == "" {
		writeError(w, http.StatusBadRequest, "type is required")
		return
	}

	svcType := domain.ServiceType(req.Type)
	if _, ok := domain.ServiceRegistry[svcType]; !ok {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("unknown service type %q", req.Type))
		return
	}

	// Verify the session exists and check for duplicates.
	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Validate service constraints on this machine.
	customTypes := map[domain.ServiceType]bool{
		domain.ServiceCustomGo:     true,
		domain.ServiceCustomNode:   true,
		domain.ServiceCustomPython: true,
	}
	isCustom := customTypes[svcType]

	for _, m := range sess.Machines {
		if m.ID == machineID {
			for _, existing := range m.Services {
				// Prevent adding the same service type twice.
				if existing.Type == svcType {
					writeError(w, http.StatusConflict, fmt.Sprintf("%s is already installed on this machine", req.Type))
					return
				}
				// Only one custom runtime per machine (Go OR Node OR Python, not multiple).
				if isCustom && customTypes[existing.Type] {
					writeError(w, http.StatusConflict, fmt.Sprintf("this machine already has %s — only one custom runtime per machine", existing.Type))
					return
				}
			}
			break
		}
	}

	// Register the service immediately — no package installation.
	// Users install and configure services themselves via the terminal
	// or the config panel ("Reload Service" button).
	// This keeps the API fast and the learning hands-on.
	svc := domain.ServiceInst{
		ID:        uuid.New().String(),
		Type:      svcType,
		Status:    "pending",
		Installed: false,
	}

	if err := h.store.AddServiceToMachine(sessionID, machineID, svc); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	slog.Info("service added", "session", sessionID, "machine", machineID, "type", req.Type, "service_id", svc.ID)
	writeJSON(w, http.StatusCreated, svc)
}

// RemoveService handles DELETE /api/sessions/{id}/machines/{mid}/services/{sid}.
// It removes a service instance from the specified machine and cleans up
// any connections that referenced the removed service.
func (h *Handler) RemoveService(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")
	serviceID := chi.URLParam(r, "sid")

	// Find the service type before removing so we can clean up connections.
	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var removedType string
	for _, m := range sess.Machines {
		if m.ID == machineID {
			for _, svc := range m.Services {
				if svc.ID == serviceID {
					removedType = string(svc.Type)
					break
				}
			}
			break
		}
	}

	if err := h.store.RemoveServiceFromMachine(sessionID, machineID, serviceID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Remove any connections that reference this machine + service type.
	if removedType != "" {
		connections, _ := h.store.ListConnections(sessionID)
		for _, conn := range connections {
			if (conn.FromNode == machineID && conn.FromService == removedType) ||
				(conn.ToNode == machineID && conn.ToService == removedType) {
				if err := h.store.RemoveConnection(sessionID, conn.ID); err != nil {
					slog.Warn("failed to remove orphaned connection", "connection", conn.ID, "error", err)
				} else {
					slog.Info("removed orphaned connection", "connection", conn.ID, "from", conn.FromService, "to", conn.ToService)
				}
			}
		}
	}

	slog.Info("service removed", "session", sessionID, "machine", machineID, "service", serviceID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": serviceID})
}
