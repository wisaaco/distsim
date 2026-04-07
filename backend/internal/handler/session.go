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

// templatePosition returns an architecture-aware (x, y) canvas position for a
// machine based on its template and hostname. Layouts follow a left-to-right
// data flow: entry → app tier → data tier → replicas/observability.
func templatePosition(template, hostname string, index int) (float64, float64) {
	type pos struct{ x, y float64 }

	// Small: LB/App left → DB center → Replica right
	smallLayout := map[string]pos{
		"client":     {-300, 100},
		"app-server": {0, 100},
		"db-primary": {400, 100},
		"db-replica": {800, 100},
	}

	// Medium: 4-column architecture layout
	//   Col 0: LB
	//   Col 1: App servers (stacked)
	//   Col 2: Messaging (Kafka stacked)
	//   Col 3: Data tier (DB, Redis, Replica)
	mediumLayout := map[string]pos{
		"client":     {-300, 200},
		"lb":         {0, 200},
		"app-1":      {300, 0},
		"app-2":      {300, 220},
		"app-3":      {300, 440},
		"kafka-1":    {600, 0},
		"kafka-2":    {600, 220},
		"kafka-3":    {600, 440},
		"db-primary": {900, 0},
		"redis":      {900, 220},
		"db-replica": {900, 440},
	}

	// Large: 5-column architecture layout
	//   Col 0: LB
	//   Col 1: App servers (stacked)
	//   Col 2: Messaging (Kafka stacked)
	//   Col 3: Data tier (DB, Redis)
	//   Col 4: Replicas + Observability
	largeLayout := map[string]pos{
		"client":        {-300, 300},
		"lb":            {0, 300},
		"app-1":         {320, 0},
		"app-2":         {320, 200},
		"app-3":         {320, 400},
		"app-4":         {320, 600},
		"app-5":         {320, 800},
		"kafka-1":       {660, 0},
		"kafka-2":       {660, 200},
		"kafka-3":       {660, 400},
		"db-primary":    {1000, 0},
		"redis-1":       {1000, 200},
		"redis-2":       {1000, 400},
		"redis-3":       {1000, 600},
		"db-replica-1":  {1340, 0},
		"db-replica-2":  {1340, 200},
		"observability": {1340, 450},
	}

	layouts := map[string]map[string]pos{
		"small":  smallLayout,
		"medium": mediumLayout,
		"large":  largeLayout,
	}

	if layout, ok := layouts[template]; ok {
		if p, ok := layout[hostname]; ok {
			return p.x, p.y
		}
	}

	// Grid fallback for custom or unknown hostnames.
	col := index % 3
	row := index / 3
	return float64(col) * 300.0, float64(row) * 220.0
}

// createSessionRequest is the expected JSON body for POST /api/sessions.
type createSessionRequest struct {
	Name     string `json:"name"`
	Template string `json:"template"`
}

// CreateSession handles POST /api/sessions.
// It looks up the TemplateDef, creates an isolated Docker network, spins up
// the template's machines with their services and connections pre-configured,
// and returns the complete session object.
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req createSessionRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Template == "" {
		req.Template = "small"
	}

	tmpl, ok := domain.TemplateRegistry[req.Template]
	if !ok {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("unknown template %q (valid: small, medium, large, custom)", req.Template))
		return
	}

	ctx := r.Context()

	// Reserve a subnet and create the Docker network.
	subnet := h.store.NextSubnet()
	networkName := fmt.Sprintf("distsim-%s", req.Name)
	networkID, err := h.docker.CreateNetwork(ctx, networkName, subnet)
	if err != nil {
		slog.Error("failed to create network", "name", networkName, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create session network")
		return
	}

	// Store the session.
	sess := h.store.Create(req.Name, req.Template, networkID, subnet)
	if sess == nil {
		// Max sessions reached — clean up the network we just created.
		h.docker.RemoveNetwork(ctx, networkID)
		writeError(w, http.StatusTooManyRequests, "maximum number of concurrent sessions reached (10). Delete an existing session first.")
		return
	}
	slog.Info("session created", "id", sess.ID, "name", sess.Name, "network", networkID)

	// For "custom" template, just create the network — no machines.
	if req.Template == "custom" {
		writeJSON(w, http.StatusCreated, sess)
		return
	}

	// hostnameToMachineID maps template hostnames to generated machine IDs
	// so we can resolve connections after all machines are created.
	hostnameToMachineID := make(map[string]string, len(tmpl.Machines))

	// Spin up the template's machines with spread-out canvas positions.
	for i, tmplMachine := range tmpl.Machines {
		containerName := fmt.Sprintf("%s-%s", tmplMachine.Hostname, sess.ID[:8])

		info, err := h.docker.CreateContainer(ctx, docker.ContainerOpts{
			Hostname:     containerName,
			Image:        tmplMachine.Image,
			NetworkID:    networkID,
			NetworkAlias: tmplMachine.Hostname,
		})
		if err != nil {
			slog.Error("failed to create machine", "hostname", tmplMachine.Hostname, "error", err)
			// Continue creating remaining machines — partial success is acceptable.
			continue
		}

		// Use architecture-aware layout per template, grid fallback for unknown.
		posX, posY := templatePosition(req.Template, tmplMachine.Hostname, i)

		machineID := uuid.New().String()
		hostnameToMachineID[tmplMachine.Hostname] = machineID

		// Build the service instances for this machine.
		services := make([]domain.ServiceInst, 0, len(tmplMachine.Services))
		for _, svcType := range tmplMachine.Services {
			services = append(services, domain.ServiceInst{
				ID:        uuid.New().String(),
				Type:      svcType,
				Status:    "pending",
				Installed: false,
			})
		}

		machine := domain.Machine{
			ID:          machineID,
			Hostname:    tmplMachine.Hostname,
			IP:          info.IP,
			ContainerID: info.ID,
			Image:       tmplMachine.Image,
			Status:      "running",
			Services:    services,
			SessionID:   sess.ID,
			PositionX:   posX,
			PositionY:   posY,
		}
		if err := h.store.AddMachine(sess.ID, machine); err != nil {
			slog.Error("failed to register machine in store", "error", err)
		}

		slog.Info("machine created",
			"hostname", tmplMachine.Hostname,
			"ip", info.IP,
			"container", info.ID[:12],
			"services", len(services),
		)
	}

	// Create connections between machines, resolving hostnames to machine IDs.
	for _, tmplConn := range tmpl.Connections {
		fromID, fromOk := hostnameToMachineID[tmplConn.FromHostname]
		toID, toOk := hostnameToMachineID[tmplConn.ToHostname]

		if !fromOk || !toOk {
			slog.Warn("skipping connection — machine not found",
				"from_hostname", tmplConn.FromHostname,
				"to_hostname", tmplConn.ToHostname,
				"from_resolved", fromOk,
				"to_resolved", toOk,
			)
			continue
		}

		conn := domain.Connection{
			ID:          uuid.New().String(),
			SessionID:   sess.ID,
			FromNode:    fromID,
			FromService: tmplConn.FromService,
			ToNode:      toID,
			ToService:   tmplConn.ToService,
			Protocol:    tmplConn.Protocol,
			Status:      "active",
		}

		if err := h.store.AddConnection(sess.ID, conn); err != nil {
			slog.Error("failed to add template connection", "error", err)
		}
	}

	// Re-fetch the session to include all machines and connections.
	sess, _ = h.store.Get(sess.ID)
	writeJSON(w, http.StatusCreated, sess)
}

// ListSessions handles GET /api/sessions.
// It returns all active sessions.
func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sessions := h.store.List()
	writeJSON(w, http.StatusOK, sessions)
}

// GetSession handles GET /api/sessions/{id}.
// It returns a single session by ID, or 404 if not found.
func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sess, err := h.store.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

// DeleteSession handles DELETE /api/sessions/{id}.
// It tears down all containers and the Docker network, then removes the
// session from the store.
func (h *Handler) DeleteSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ctx := r.Context()

	sess, err := h.store.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// 1. Revert and clean up all chaos events for this session.
	if h.chaos != nil {
		h.chaos.CleanupSession(ctx, id)
	}

	// 2. Close all terminal sessions for machines in this session.
	if h.terminal != nil {
		for _, m := range sess.Machines {
			h.terminal.Close(m.ID)
		}
	}

	// 3. Force-remove all containers.
	for _, m := range sess.Machines {
		if err := h.docker.RemoveContainer(ctx, m.ContainerID); err != nil {
			slog.Error("failed to remove container", "container", m.ContainerID, "error", err)
		}
	}

	// 4. Remove the network (retries once if containers were slow to detach).
	if err := h.docker.RemoveNetwork(ctx, sess.NetworkID); err != nil {
		slog.Warn("network removal failed, retrying", "network", sess.NetworkID, "error", err)
		// Containers may take a moment to detach. Wait and retry.
		h.docker.RemoveNetwork(ctx, sess.NetworkID)
	}

	// 5. Remove from store.
	if err := h.store.Delete(id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete session from store")
		return
	}

	slog.Info("session deleted", "id", id, "name", sess.Name)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": id})
}
