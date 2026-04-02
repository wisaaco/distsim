package chaos

import (
	"context"
	"fmt"
)

// injectCPUStress consumes CPU cores using stress-ng running in the background.
// Params: "cores" (e.g. "2"), "duration" (seconds, e.g. "60", optional).
func (e *Engine) injectCPUStress(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	cores := params["cores"]
	if cores == "" {
		cores = "1"
	}

	cmd := fmt.Sprintf("stress-ng --cpu %s", cores)
	if duration := params["duration"]; duration != "" {
		cmd += fmt.Sprintf(" --timeout %s", duration)
	}
	// Run in background so the exec call returns immediately.
	cmd += " &"

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing cpu stress: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("cpu stress command exited with code %d", exitCode)
	}

	return "pkill stress-ng", nil
}

// injectMemoryStress allocates memory using stress-ng running in the background.
// Params: "bytes" (e.g. "200M"), "duration" (seconds, e.g. "60", optional).
func (e *Engine) injectMemoryStress(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	bytes := params["bytes"]
	if bytes == "" {
		bytes = "100M"
	}

	cmd := fmt.Sprintf("stress-ng --vm 1 --vm-bytes %s", bytes)
	if duration := params["duration"]; duration != "" {
		cmd += fmt.Sprintf(" --timeout %s", duration)
	}
	// Run in background so the exec call returns immediately.
	cmd += " &"

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing memory stress: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("memory stress command exited with code %d", exitCode)
	}

	return "pkill stress-ng", nil
}

// injectDiskFill fills disk space by writing a zero-filled file to /tmp.
// Params: "size" (e.g. "500M").
func (e *Engine) injectDiskFill(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	size := params["size"]
	if size == "" {
		size = "100M"
	}

	// Parse the size to extract the numeric part for dd count.
	// We expect formats like "500M" or "1G". Use fallocate if available,
	// fall back to dd for maximum compatibility.
	cmd := fmt.Sprintf("dd if=/dev/zero of=/tmp/distsim-fill bs=1M count=%s", stripUnit(size))

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing disk fill: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("disk fill command exited with code %d", exitCode)
	}

	return "rm -f /tmp/distsim-fill", nil
}

// stripUnit removes a trailing unit suffix (M, G, K) from a size string,
// returning just the numeric portion for use with dd count.
func stripUnit(s string) string {
	if len(s) == 0 {
		return "100"
	}
	last := s[len(s)-1]
	if last == 'M' || last == 'G' || last == 'K' || last == 'm' || last == 'g' || last == 'k' {
		return s[:len(s)-1]
	}
	return s
}
