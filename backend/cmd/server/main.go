// Package main is the entry point for the DistSim API server.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/hamidlabs/distsim/internal/chaos"
	"github.com/hamidlabs/distsim/internal/config"
	"github.com/hamidlabs/distsim/internal/docker"
	"github.com/hamidlabs/distsim/internal/domain"
	"github.com/hamidlabs/distsim/internal/handler"
	"github.com/hamidlabs/distsim/internal/router"
	"github.com/hamidlabs/distsim/internal/server"
	"github.com/hamidlabs/distsim/internal/terminal"
	"github.com/hamidlabs/distsim/internal/typesys"
)

func main() {
	// Load configuration from environment variables.
	cfg := config.Load()

	// Set up structured logging.
	logHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	})
	slog.SetDefault(slog.New(logHandler))

	slog.Info("starting distsim", "port", cfg.Port, "log_level", cfg.LogLevel.String())

	// Initialize the Docker client.
	dockerClient, err := docker.New()
	if err != nil {
		slog.Error("failed to create docker client", "error", err)
		os.Exit(1)
	}
	defer dockerClient.Close()

	// Verify Docker connectivity at startup.
	if err := dockerClient.Ping(context.Background()); err != nil {
		slog.Warn("docker daemon not reachable at startup — sessions will fail until it's available", "error", err)
	} else {
		slog.Info("docker daemon connected")
	}

	// Clean up orphaned containers and networks from previous runs.
	// In-memory store loses state on restart, but Docker resources persist.
	cleaned, err := dockerClient.CleanupOrphaned(context.Background())
	if err != nil {
		slog.Warn("orphan cleanup had errors", "error", err)
	}
	if cleaned > 0 {
		slog.Info("cleaned up orphaned resources", "count", cleaned)
	}

	// Initialize the in-memory session store.
	store := domain.NewSessionStore()

	// Initialize the type checker for connection validation.
	checker := typesys.NewChecker()

	// Initialize the terminal session manager.
	termManager := terminal.NewManager(dockerClient)

	// Initialize the chaos engineering engine.
	chaosEngine := chaos.New(dockerClient)

	// Wire up handlers and router.
	h := handler.New(dockerClient, store, checker, termManager, chaosEngine)
	r := router.New(h)

	// Create the HTTP server.
	srv := server.New(cfg, r)

	// Set up signal handling for graceful shutdown.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Start the server — blocks until context is cancelled or an error occurs.
	if err := srv.Start(ctx); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	// Revert all active chaos events before shutting down.
	slog.Info("reverting all active chaos events on shutdown")
	chaosEngine.RevertAllSessions(context.Background())

	// Close all terminal sessions on shutdown.
	termManager.CloseAll()
}
