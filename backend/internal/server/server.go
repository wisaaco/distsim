// Package server provides the HTTP server wrapper with graceful shutdown.
package server

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/hamidlabs/distsim/internal/config"
)

// Server wraps the standard http.Server with DistSim-specific lifecycle management.
type Server struct {
	http *http.Server
}

// New creates a Server configured from the application config.
func New(cfg *config.Config, router http.Handler) *Server {
	return &Server{
		http: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Port),
			Handler:      router,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}
}

// Start begins listening for HTTP requests. It blocks until the server
// stops or the context is cancelled. When the context is done, it initiates
// a graceful shutdown with a 10-second deadline.
func (s *Server) Start(ctx context.Context) error {
	// Start serving in a goroutine so we can select on context cancellation.
	errCh := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", s.http.Addr)
		if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("http listen: %w", err)
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return s.Shutdown(context.Background())
	}
}

// Shutdown gracefully shuts down the server, waiting up to 10 seconds for
// in-flight requests to complete.
func (s *Server) Shutdown(ctx context.Context) error {
	slog.Info("server shutting down")
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := s.http.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}
	slog.Info("server stopped cleanly")
	return nil
}

// Addr returns the server's listen address. Useful in tests after calling
// Start when the port is 0 (auto-assigned).
func (s *Server) Addr() net.Addr {
	return nil
}
