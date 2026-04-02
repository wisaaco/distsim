package docker

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
)

// ExecCommand runs a command inside a container and returns the combined
// stdout+stderr output along with the exit code. The command is executed
// with a 30-second timeout.
func (c *Client) ExecCommand(ctx context.Context, containerID string, cmd []string) (string, int, error) {
	execCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	resp, err := c.api.ContainerExecCreate(execCtx, containerID, container.ExecOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          false,
	})
	if err != nil {
		return "", -1, fmt.Errorf("creating exec in container %q: %w", containerID, err)
	}

	attach, err := c.api.ContainerExecAttach(execCtx, resp.ID, container.ExecStartOptions{
		Tty: false,
	})
	if err != nil {
		return "", -1, fmt.Errorf("attaching to exec %q: %w", resp.ID, err)
	}
	defer attach.Close()

	// Read stdout and stderr separately (non-TTY mode uses Docker's multiplexed stream).
	var stdout, stderr bytes.Buffer
	if _, err := stdcopy.StdCopy(&stdout, &stderr, attach.Reader); err != nil {
		return "", -1, fmt.Errorf("reading exec output: %w", err)
	}

	// Get the exit code.
	inspect, err := c.api.ContainerExecInspect(execCtx, resp.ID)
	if err != nil {
		return "", -1, fmt.Errorf("inspecting exec %q: %w", resp.ID, err)
	}

	// Combine stdout and stderr for the caller.
	var combined strings.Builder
	combined.Write(stdout.Bytes())
	if stderr.Len() > 0 {
		combined.Write(stderr.Bytes())
	}

	return combined.String(), inspect.ExitCode, nil
}

// ExecDetached runs a command inside a container without waiting for it to
// finish. This is used for starting long-running services (like node, python)
// that should survive after the exec session ends.
func (c *Client) ExecDetached(ctx context.Context, containerID string, cmd []string) error {
	resp, err := c.api.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd:          cmd,
		AttachStdout: false,
		AttachStderr: false,
		Detach:       true,
	})
	if err != nil {
		return fmt.Errorf("creating detached exec: %w", err)
	}

	if err := c.api.ContainerExecStart(ctx, resp.ID, container.ExecStartOptions{Detach: true}); err != nil {
		return fmt.Errorf("starting detached exec: %w", err)
	}

	return nil
}

// WriteFile writes content to a file inside a container using the Docker
// CopyToContainer API. It creates a tar archive containing the file and
// extracts it at the parent directory.
func (c *Client) WriteFile(ctx context.Context, containerID, path, content string) error {
	dir := filepath.Dir(path)
	base := filepath.Base(path)

	// Ensure the parent directory exists.
	_, _, err := c.ExecCommand(ctx, containerID, []string{"mkdir", "-p", dir})
	if err != nil {
		return fmt.Errorf("creating directory %q: %w", dir, err)
	}

	// Build a tar archive with a single file.
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)

	hdr := &tar.Header{
		Name:    base,
		Mode:    0644,
		Size:    int64(len(content)),
		ModTime: time.Now(),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		return fmt.Errorf("writing tar header: %w", err)
	}
	if _, err := tw.Write([]byte(content)); err != nil {
		return fmt.Errorf("writing tar content: %w", err)
	}
	if err := tw.Close(); err != nil {
		return fmt.Errorf("closing tar writer: %w", err)
	}

	// Copy the tar archive into the container.
	if err := c.api.CopyToContainer(ctx, containerID, dir, &buf, container.CopyToContainerOptions{}); err != nil {
		return fmt.Errorf("copying file to container %q at %q: %w", containerID, path, err)
	}

	return nil
}

// ReadFile reads a file from inside a container and returns its content
// as a string. It uses the Docker CopyFromContainer API.
func (c *Client) ReadFile(ctx context.Context, containerID, path string) (string, error) {
	reader, _, err := c.api.CopyFromContainer(ctx, containerID, path)
	if err != nil {
		return "", fmt.Errorf("copying file from container %q at %q: %w", containerID, path, err)
	}
	defer reader.Close()

	// The response is a tar archive — extract the single file.
	tr := tar.NewReader(reader)
	_, err = tr.Next()
	if err != nil {
		return "", fmt.Errorf("reading tar entry: %w", err)
	}

	content, err := io.ReadAll(tr)
	if err != nil {
		return "", fmt.Errorf("reading file content: %w", err)
	}

	return string(content), nil
}
