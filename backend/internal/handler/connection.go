package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/hamidlabs/distsim/internal/domain"
	"github.com/hamidlabs/distsim/internal/typesys"
)

// createConnectionRequest is the expected JSON body for POST /api/sessions/{id}/connections.
type createConnectionRequest struct {
	FromNode    string `json:"from_node"`
	FromService string `json:"from_service"`
	FromRole    string `json:"from_role"`
	ToNode      string `json:"to_node"`
	ToService   string `json:"to_service"`
	ToRole      string `json:"to_role"`
	Protocol    string `json:"protocol"`
}

// validateConnection checks that both machines exist in the session, that both
// have the specified services, and that the connection is type-safe (protocol
// and role compatible). It returns a list of error strings (empty means valid)
// and a typed ValidationResult for richer error reporting.
func (h *Handler) validateConnection(sessionID string, req createConnectionRequest) ([]string, *typesys.ValidationResult) {
	var errs []string

	sess, err := h.store.Get(sessionID)
	if err != nil {
		return []string{err.Error()}, nil
	}

	if req.FromNode == "" {
		errs = append(errs, "from_node is required")
	}
	if req.ToNode == "" {
		errs = append(errs, "to_node is required")
	}
	if req.FromService == "" {
		errs = append(errs, "from_service is required")
	}
	if req.ToService == "" {
		errs = append(errs, "to_service is required")
	}
	if req.Protocol == "" {
		errs = append(errs, "protocol is required")
	}
	if len(errs) > 0 {
		return errs, nil
	}

	// Validate protocol.
	proto := domain.Protocol(req.Protocol)
	if !domain.ValidProtocols[proto] {
		errs = append(errs, fmt.Sprintf("unknown protocol %q", req.Protocol))
	}

	// Find source machine.
	var fromMachine *domain.Machine
	var toMachine *domain.Machine
	for i := range sess.Machines {
		if sess.Machines[i].ID == req.FromNode {
			fromMachine = &sess.Machines[i]
		}
		if sess.Machines[i].ID == req.ToNode {
			toMachine = &sess.Machines[i]
		}
	}

	if fromMachine == nil {
		errs = append(errs, fmt.Sprintf("source machine %q not found", req.FromNode))
	}
	if toMachine == nil {
		errs = append(errs, fmt.Sprintf("target machine %q not found", req.ToNode))
	}
	if fromMachine == nil || toMachine == nil {
		return errs, nil
	}

	// Check source machine has the specified service.
	fromHasService := false
	for _, svc := range fromMachine.Services {
		if string(svc.Type) == req.FromService {
			fromHasService = true
			break
		}
	}
	if !fromHasService {
		errs = append(errs, fmt.Sprintf("source machine %q does not have service %q", req.FromNode, req.FromService))
	}

	// Check target machine has the specified service.
	toHasService := false
	for _, svc := range toMachine.Services {
		if string(svc.Type) == req.ToService {
			toHasService = true
			break
		}
	}
	if !toHasService {
		errs = append(errs, fmt.Sprintf("target machine %q does not have service %q", req.ToNode, req.ToService))
	}

	if len(errs) > 0 {
		return errs, nil
	}

	// Type system validation: check self-connection, protocol, and role compatibility.
	if selfErr := h.checker.ValidateSelfConnection(req.FromNode, req.ToNode, req.FromService, req.ToService); selfErr != nil {
		result := typesys.ValidationResult{
			Valid:  false,
			Errors: []typesys.TypeError{*selfErr},
		}
		return nil, &result
	}

	fromSpec, fromOk := typesys.Registry[domain.ServiceType(req.FromService)]
	toSpec, toOk := typesys.Registry[domain.ServiceType(req.ToService)]

	if fromOk && toOk {
		result := h.checker.Validate(fromSpec, req.FromRole, toSpec, req.ToRole)
		if !result.Valid {
			return nil, &result
		}
	}

	return nil, nil
}

// CreateConnection handles POST /api/sessions/{id}/connections.
// It validates the connection (including type-safety checks) and creates it if valid.
func (h *Handler) CreateConnection(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	var req createConnectionRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	errs, typeResult := h.validateConnection(sessionID, req)
	if len(errs) > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"valid":  false,
			"errors": errs,
		})
		return
	}
	if typeResult != nil && !typeResult.Valid {
		writeJSON(w, http.StatusUnprocessableEntity, typeResult)
		return
	}

	conn := domain.Connection{
		ID:          uuid.New().String(),
		SessionID:   sessionID,
		FromNode:    req.FromNode,
		FromService: req.FromService,
		ToNode:      req.ToNode,
		ToService:   req.ToService,
		Protocol:    domain.Protocol(req.Protocol),
		Status:      "active",
	}

	if err := h.store.AddConnection(sessionID, conn); err != nil {
		slog.Error("failed to add connection", "session", sessionID, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create connection")
		return
	}

	slog.Info("connection created",
		"session", sessionID,
		"id", conn.ID,
		"from", fmt.Sprintf("%s/%s", req.FromNode, req.FromService),
		"to", fmt.Sprintf("%s/%s", req.ToNode, req.ToService),
		"protocol", req.Protocol,
	)
	writeJSON(w, http.StatusCreated, conn)
}

// ListConnections handles GET /api/sessions/{id}/connections.
// It returns all connections for the given session.
func (h *Handler) ListConnections(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	conns, err := h.store.ListConnections(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, conns)
}

// DeleteConnection handles DELETE /api/sessions/{id}/connections/{cid}.
// It removes a connection from the session.
func (h *Handler) DeleteConnection(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	connID := chi.URLParam(r, "cid")

	if err := h.store.RemoveConnection(sessionID, connID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	slog.Info("connection deleted", "session", sessionID, "connection", connID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": connID})
}

// ValidateConnection handles POST /api/sessions/{id}/connections/validate.
// It performs a dry-run validation without creating the connection.
func (h *Handler) ValidateConnection(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	var req createConnectionRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	errs, typeResult := h.validateConnection(sessionID, req)
	if len(errs) > 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"valid":  false,
			"errors": errs,
		})
		return
	}
	if typeResult != nil && !typeResult.Valid {
		writeJSON(w, http.StatusOK, typeResult)
		return
	}

	writeJSON(w, http.StatusOK, typesys.ValidationResult{
		Valid: true,
	})
}
