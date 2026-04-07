// Package chaos provides a chaos engineering engine for injecting failures
// into DistSim session containers. It supports network, process, and resource
// faults with automatic revert tracking.
package chaos

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/hamidlabs/distsim/internal/docker"
)

// ActionType identifies the kind of chaos fault to inject.
type ActionType string

const (
	// ActionNetworkDelay adds latency to all outbound traffic using tc netem.
	ActionNetworkDelay ActionType = "network_delay"
	// ActionNetworkLoss drops a percentage of packets using tc netem.
	ActionNetworkLoss ActionType = "network_loss"
	// ActionNetworkPartition blocks all traffic to/from a specific IP using iptables.
	ActionNetworkPartition ActionType = "network_partition"
	// ActionKillProcess sends a signal to a named process inside the container.
	ActionKillProcess ActionType = "kill_process"
	// ActionKillContainer stops the entire Docker container.
	ActionKillContainer ActionType = "kill_container"
	// ActionCPUStress consumes CPU cores using stress-ng.
	ActionCPUStress ActionType = "cpu_stress"
	// ActionMemoryStress allocates memory using stress-ng.
	ActionMemoryStress ActionType = "memory_stress"
	// ActionDiskFill fills disk space with a zero-filled file.
	ActionDiskFill ActionType = "disk_fill"
)

// ChaosEvent tracks a single injected fault, including the command needed
// to revert it and its current status.
type ChaosEvent struct {
	// ID is a unique identifier for this chaos event.
	ID string `json:"id"`
	// SessionID links this event to its parent session.
	SessionID string `json:"session_id"`
	// MachineID is the DistSim machine targeted by this event.
	MachineID string `json:"machine_id"`
	// ContainerID is the Docker container targeted by this event.
	ContainerID string `json:"container_id"`
	// Action is the type of chaos fault that was injected.
	Action ActionType `json:"action"`
	// Params holds action-specific configuration (e.g., delay duration, target IP).
	Params map[string]string `json:"params"`
	// UndoCmd is the shell command to revert this fault. Empty if not revertible.
	UndoCmd string `json:"-"`
	// Status is the current state: "active" or "reverted".
	Status string `json:"status"`
	// CreatedAt records when this fault was injected.
	CreatedAt time.Time `json:"created_at"`
}

// Engine is the central chaos dispatcher. It tracks all active faults
// and provides inject/revert operations backed by the Docker client.
type Engine struct {
	mu     sync.RWMutex
	events map[string]*ChaosEvent
	docker *docker.Client
}

// New creates a chaos engine backed by the given Docker client.
func New(docker *docker.Client) *Engine {
	return &Engine{
		events: make(map[string]*ChaosEvent),
		docker: docker,
	}
}

// Inject dispatches a chaos fault to the appropriate handler based on the
// event's Action type. It generates an ID, records the event, and stores
// the undo command for later revert.
func (e *Engine) Inject(ctx context.Context, event *ChaosEvent) error {
	event.ID = uuid.New().String()
	event.Status = "active"
	event.CreatedAt = time.Now().UTC()

	var undoCmd string
	var err error

	switch event.Action {
	case ActionNetworkDelay:
		undoCmd, err = e.injectNetworkDelay(ctx, event.ContainerID, event.Params)
	case ActionNetworkLoss:
		undoCmd, err = e.injectNetworkLoss(ctx, event.ContainerID, event.Params)
	case ActionNetworkPartition:
		undoCmd, err = e.injectNetworkPartition(ctx, event.ContainerID, event.Params)
	case ActionKillProcess:
		undoCmd, err = e.injectKillProcess(ctx, event.ContainerID, event.Params)
	case ActionKillContainer:
		undoCmd, err = e.injectKillContainer(ctx, event.ContainerID, event.Params)
	case ActionCPUStress:
		undoCmd, err = e.injectCPUStress(ctx, event.ContainerID, event.Params)
	case ActionMemoryStress:
		undoCmd, err = e.injectMemoryStress(ctx, event.ContainerID, event.Params)
	case ActionDiskFill:
		undoCmd, err = e.injectDiskFill(ctx, event.ContainerID, event.Params)
	default:
		return fmt.Errorf("unknown chaos action %q", event.Action)
	}

	if err != nil {
		return fmt.Errorf("injecting %s on container %q: %w", event.Action, event.ContainerID, err)
	}

	event.UndoCmd = undoCmd

	e.mu.Lock()
	e.events[event.ID] = event
	e.mu.Unlock()

	slog.Info("chaos injected",
		"id", event.ID,
		"action", event.Action,
		"session", event.SessionID,
		"machine", event.MachineID,
		"container", event.ContainerID,
	)

	return nil
}

// Revert undoes a specific chaos event by running its stored undo command.
// Returns an error if the event is not found or already reverted.
func (e *Engine) Revert(ctx context.Context, eventID string) error {
	e.mu.Lock()
	event, ok := e.events[eventID]
	if !ok {
		e.mu.Unlock()
		return fmt.Errorf("chaos event %q not found", eventID)
	}
	if event.Status == "reverted" {
		e.mu.Unlock()
		return fmt.Errorf("chaos event %q already reverted", eventID)
	}
	e.mu.Unlock()

	if event.UndoCmd == "" {
		// Non-revertible action (e.g., kill_process). Just mark as reverted.
		e.mu.Lock()
		event.Status = "reverted"
		e.mu.Unlock()

		slog.Info("chaos marked reverted (no undo cmd)", "id", eventID, "action", event.Action)
		return nil
	}

	// For kill_container, use Docker API to start the container again.
	if event.Action == ActionKillContainer {
		if err := e.revertKillContainer(ctx, event.ContainerID); err != nil {
			return fmt.Errorf("reverting kill_container on %q: %w", event.ContainerID, err)
		}
	} else {
		// Run the undo command inside the container.
		_, exitCode, err := e.docker.ExecCommand(ctx, event.ContainerID, []string{"sh", "-c", event.UndoCmd})
		if err != nil {
			return fmt.Errorf("reverting chaos event %q: %w", eventID, err)
		}
		if exitCode != 0 {
			slog.Warn("chaos revert command exited non-zero", "id", eventID, "exit_code", exitCode)
		}
	}

	e.mu.Lock()
	event.Status = "reverted"
	e.mu.Unlock()

	slog.Info("chaos reverted", "id", eventID, "action", event.Action)
	return nil
}

// List returns all chaos events for a given session, both active and reverted.
func (e *Engine) List(sessionID string) []*ChaosEvent {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var result []*ChaosEvent
	for _, event := range e.events {
		if event.SessionID == sessionID {
			result = append(result, event)
		}
	}
	return result
}

// RevertAll reverts all active chaos events for a given session.
// It logs errors for individual reverts but continues attempting all.
func (e *Engine) RevertAll(ctx context.Context, sessionID string) error {
	e.mu.RLock()
	var activeIDs []string
	for _, event := range e.events {
		if event.SessionID == sessionID && event.Status == "active" {
			activeIDs = append(activeIDs, event.ID)
		}
	}
	e.mu.RUnlock()

	var firstErr error
	for _, id := range activeIDs {
		if err := e.Revert(ctx, id); err != nil {
			slog.Error("failed to revert chaos event during revert-all", "id", id, "error", err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

// CleanupSession reverts all active chaos events for a session and removes
// ALL events (active + reverted) from memory. Call this when a session is deleted.
func (e *Engine) CleanupSession(ctx context.Context, sessionID string) {
	// Revert active events first.
	_ = e.RevertAll(ctx, sessionID)

	// Remove all events for this session from memory.
	e.mu.Lock()
	for id, event := range e.events {
		if event.SessionID == sessionID {
			delete(e.events, id)
		}
	}
	e.mu.Unlock()

	slog.Info("chaos events cleaned up for session", "session", sessionID)
}

// RevertAllSessions reverts all active chaos events across all sessions.
// Called during server shutdown.
func (e *Engine) RevertAllSessions(ctx context.Context) {
	e.mu.RLock()
	sessionIDs := make(map[string]struct{})
	for _, event := range e.events {
		if event.Status == "active" {
			sessionIDs[event.SessionID] = struct{}{}
		}
	}
	e.mu.RUnlock()

	for sid := range sessionIDs {
		if err := e.RevertAll(ctx, sid); err != nil {
			slog.Error("failed to revert chaos for session during shutdown", "session", sid, "error", err)
		}
	}
}
