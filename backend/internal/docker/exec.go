package docker

import (
	"bufio"
	"context"
	"fmt"
	"net"

	"github.com/docker/docker/api/types/container"
)

// HijackedResponse wraps the Docker SDK's hijacked connection, providing
// access to the raw bidirectional stream (for exec attach).
type HijackedResponse struct {
	// Conn is the raw network connection to the exec process.
	Conn net.Conn
	// Reader is a buffered reader over Conn (may contain data already read).
	Reader *bufio.Reader
}

// Close releases the hijacked connection.
func (h *HijackedResponse) Close() {
	if h.Conn != nil {
		h.Conn.Close()
	}
}

// ExecCreate creates an exec instance inside the specified container.
// The returned string is the exec ID, which can be passed to ExecAttach
// and ExecResize.
func (c *Client) ExecCreate(ctx context.Context, containerID string, cmd []string) (string, error) {
	resp, err := c.api.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd:          cmd,
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
	})
	if err != nil {
		return "", fmt.Errorf("creating exec in container %q: %w", containerID, err)
	}
	return resp.ID, nil
}

// ExecAttach connects to an exec instance and returns a HijackedResponse
// whose Conn field is a bidirectional stream (stdin/stdout/stderr).
func (c *Client) ExecAttach(ctx context.Context, execID string) (HijackedResponse, error) {
	resp, err := c.api.ContainerExecAttach(ctx, execID, container.ExecStartOptions{
		Tty: true,
	})
	if err != nil {
		return HijackedResponse{}, fmt.Errorf("attaching to exec %q: %w", execID, err)
	}
	return HijackedResponse{Conn: resp.Conn, Reader: resp.Reader}, nil
}

// ExecResize changes the TTY size of a running exec instance.
func (c *Client) ExecResize(ctx context.Context, execID string, height, width uint) error {
	if err := c.api.ContainerExecResize(ctx, execID, container.ResizeOptions{
		Height: height,
		Width:  width,
	}); err != nil {
		return fmt.Errorf("resizing exec %q: %w", execID, err)
	}
	return nil
}
