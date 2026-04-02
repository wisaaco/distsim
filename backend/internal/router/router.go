// Package router sets up the HTTP route table for the DistSim API.
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/hamidlabs/distsim/internal/handler"
	"github.com/hamidlabs/distsim/internal/middleware"
)

// New creates the chi router with all middleware and routes wired up.
func New(h *handler.Handler) http.Handler {
	r := chi.NewRouter()

	// Middleware stack — order matters.
	r.Use(chimw.Recoverer)          // Recover from panics, return 500.
	r.Use(middleware.CORS)          // Allow frontend at localhost:3000.
	r.Use(middleware.RequestLogger) // Structured request logging with slog.
	r.Use(chimw.RealIP)             // Trust X-Forwarded-For / X-Real-IP.
	r.Use(chimw.RequestID)          // Inject X-Request-Id header.

	// API routes.
	r.Route("/api", func(r chi.Router) {
		// Health checks.
		r.Get("/health", h.Health)
		r.Get("/ready", h.Ready)

		// Service registry (static definitions for the frontend toolbar).
		r.Get("/services", h.ListServiceDefs)

		// Templates (rich definitions with machines, services, connections).
		r.Get("/templates", h.ListTemplates)
		r.Get("/templates/{id}", h.GetTemplate)

		// Sessions.
		r.Post("/sessions", h.CreateSession)
		r.Get("/sessions", h.ListSessions)

		// Single-session routes.
		r.Route("/sessions/{id}", func(r chi.Router) {
			r.Get("/", h.GetSession)
			r.Delete("/", h.DeleteSession)

			// Machines within a session.
			r.Get("/machines", h.ListMachines)
			r.Post("/machines", h.AddMachine)
			r.Put("/machines/{mid}/position", h.UpdateMachinePosition)
			r.Delete("/machines/{mid}", h.DeleteMachine)

			// Services on a machine.
			r.Post("/machines/{mid}/services", h.AddService)
			r.Delete("/machines/{mid}/services/{sid}", h.RemoveService)
			r.Post("/machines/{mid}/services/{sid}/install", h.InstallService)
			r.Post("/machines/{mid}/api-test", h.APITest)

			// Terminal (WebSocket) for interactive shell access.
			r.Get("/machines/{mid}/terminal", h.Terminal)

			// File read/write and command execution on a machine.
			r.Get("/machines/{mid}/files", h.ReadFile)
			r.Put("/machines/{mid}/files", h.WriteFile)
			r.Post("/machines/{mid}/exec", h.ExecCommand)
			r.Post("/machines/{mid}/exec-detached", h.ExecDetached)

			// Connections between services.
			r.Post("/connections", h.CreateConnection)
			r.Get("/connections", h.ListConnections)
			r.Delete("/connections/{cid}", h.DeleteConnection)
			r.Post("/connections/validate", h.ValidateConnection)

			// Chaos engineering.
			r.Post("/chaos", h.InjectChaos)
			r.Get("/chaos", h.ListChaos)
			r.Delete("/chaos/{cid}", h.RevertChaos)
			r.Post("/chaos/revert-all", h.RevertAllChaos)

			// Observability.
			r.Get("/machines/{mid}/logs", h.StreamLogs)
			r.Get("/status", h.SessionStatus)
		})
	})

	return r
}
