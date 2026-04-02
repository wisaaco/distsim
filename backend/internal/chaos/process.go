package chaos

import (
	"context"
	"fmt"
)

// injectKillProcess sends a signal to a named process inside the container.
// Params: "process" (e.g. "nginx"), "signal" (e.g. "9", optional, defaults to 9).
// This action is not revertible — the process is dead once killed.
func (e *Engine) injectKillProcess(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	process := params["process"]
	if process == "" {
		return "", fmt.Errorf("param 'process' is required for kill_process")
	}

	signal := params["signal"]
	if signal == "" {
		signal = "9"
	}

	cmd := fmt.Sprintf("pkill -%s %s", signal, process)

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing pkill: %w", err)
	}
	// pkill returns 1 if no process matched — treat that as an error.
	if exitCode != 0 {
		return "", fmt.Errorf("pkill exited with code %d (process %q may not exist)", exitCode, process)
	}

	// Process kill is not revertible.
	return "", nil
}

// injectKillContainer stops the Docker container using the Docker API.
// Revert starts the container again.
func (e *Engine) injectKillContainer(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	if err := e.docker.StopContainer(ctx, containerID); err != nil {
		return "", fmt.Errorf("stopping container: %w", err)
	}

	// The undo is handled specially via Docker API, not a shell command.
	// We use a sentinel value so Revert knows this needs Docker API.
	return "__docker_start__", nil
}

// revertKillContainer starts a previously stopped container using the Docker API.
func (e *Engine) revertKillContainer(ctx context.Context, containerID string) error {
	return e.docker.StartContainer(ctx, containerID)
}
