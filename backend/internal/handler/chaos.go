package handler

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/hamidlabs/distsim/internal/chaos"
)

// injectChaosRequest is the expected JSON body for POST /api/sessions/{id}/chaos.
type injectChaosRequest struct {
	MachineID string            `json:"machine_id"`
	Action    string            `json:"action"`
	Params    map[string]string `json:"params"`
}

// InjectChaos handles POST /api/sessions/{id}/chaos.
// It injects a chaos fault into the specified machine's container.
func (h *Handler) InjectChaos(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	ctx := r.Context()

	if h.chaos == nil {
		writeError(w, http.StatusServiceUnavailable, "chaos engine not available")
		return
	}

	var req injectChaosRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.MachineID == "" {
		writeError(w, http.StatusBadRequest, "machine_id is required")
		return
	}
	if req.Action == "" {
		writeError(w, http.StatusBadRequest, "action is required")
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
		if m.ID == req.MachineID {
			containerID = m.ContainerID
			break
		}
	}
	if containerID == "" {
		writeError(w, http.StatusNotFound, "machine not found in session")
		return
	}

	event := &chaos.ChaosEvent{
		SessionID:   sessionID,
		MachineID:   req.MachineID,
		ContainerID: containerID,
		Action:      chaos.ActionType(req.Action),
		Params:      req.Params,
	}

	if err := h.chaos.Inject(ctx, event); err != nil {
		slog.Error("chaos injection failed",
			"session", sessionID,
			"machine", req.MachineID,
			"action", req.Action,
			"error", err,
		)
		writeError(w, http.StatusInternalServerError, "failed to inject chaos: "+err.Error())
		return
	}

	slog.Info("chaos injected", "id", event.ID, "action", req.Action, "machine", req.MachineID)
	writeJSON(w, http.StatusCreated, event)
}

// ListChaos handles GET /api/sessions/{id}/chaos.
// It returns all chaos events (active and reverted) for the session.
func (h *Handler) ListChaos(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	if h.chaos == nil {
		writeError(w, http.StatusServiceUnavailable, "chaos engine not available")
		return
	}

	// Verify the session exists.
	if _, err := h.store.Get(sessionID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	events := h.chaos.List(sessionID)
	if events == nil {
		events = []*chaos.ChaosEvent{}
	}

	writeJSON(w, http.StatusOK, events)
}

// RevertChaos handles DELETE /api/sessions/{id}/chaos/{cid}.
// It reverts a specific chaos event by running its undo command.
func (h *Handler) RevertChaos(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	chaosID := chi.URLParam(r, "cid")
	ctx := r.Context()

	if h.chaos == nil {
		writeError(w, http.StatusServiceUnavailable, "chaos engine not available")
		return
	}

	// Verify the session exists.
	if _, err := h.store.Get(sessionID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := h.chaos.Revert(ctx, chaosID); err != nil {
		slog.Error("chaos revert failed", "session", sessionID, "chaos_id", chaosID, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to revert chaos: "+err.Error())
		return
	}

	slog.Info("chaos reverted", "id", chaosID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "reverted", "id": chaosID})
}

// RevertAllChaos handles POST /api/sessions/{id}/chaos/revert-all.
// It reverts all active chaos events for the session.
func (h *Handler) RevertAllChaos(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	ctx := r.Context()

	if h.chaos == nil {
		writeError(w, http.StatusServiceUnavailable, "chaos engine not available")
		return
	}

	// Verify the session exists.
	if _, err := h.store.Get(sessionID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := h.chaos.RevertAll(ctx, sessionID); err != nil {
		slog.Error("chaos revert-all failed", "session", sessionID, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to revert all chaos: "+err.Error())
		return
	}

	slog.Info("all chaos reverted", "session", sessionID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "all_reverted", "session_id": sessionID})
}
