package docker

import (
	"context"
	"fmt"
	"io"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
)

// ContainerOpts configures a new container for a DistSim session machine.
type ContainerOpts struct {
	// Hostname is the container's hostname and DNS alias within the network.
	Hostname string
	// Image is the Docker image to use (e.g. "alpine:latest", "distsim-base").
	Image string
	// NetworkID is the Docker network to attach the container to.
	NetworkID string
	// NetworkAlias is an additional DNS name for the container on the network.
	NetworkAlias string
	// Memory is the memory limit in bytes. Default: 256 MiB.
	Memory int64
	// CPUQuota sets the CPU quota in microseconds per 100ms period. Default: 50000 (0.5 CPU).
	CPUQuota int64
}

// ContainerInfo holds the result of creating and starting a container.
type ContainerInfo struct {
	// ID is the Docker container ID.
	ID string
	// IP is the container's IP address on the session network.
	IP string
	// Hostname is the container's hostname.
	Hostname string
}

const (
	defaultMemory   = 256 * 1024 * 1024 // 256 MiB
	defaultCPUQuota = 50000             // 0.5 CPU (50ms per 100ms period)
)

// CreateContainer creates and starts a container with the given options.
// It returns the container ID, IP, and hostname on success.
func (c *Client) CreateContainer(ctx context.Context, opts ContainerOpts) (*ContainerInfo, error) {
	if opts.Memory == 0 {
		opts.Memory = defaultMemory
	}
	if opts.CPUQuota == 0 {
		opts.CPUQuota = defaultCPUQuota
	}

	aliases := []string{opts.Hostname}
	if opts.NetworkAlias != "" && opts.NetworkAlias != opts.Hostname {
		aliases = append(aliases, opts.NetworkAlias)
	}

	resp, err := c.api.ContainerCreate(ctx,
		&container.Config{
			Image:    opts.Image,
			Hostname: opts.Hostname,
			Labels: map[string]string{
				"managed-by": "distsim",
				"hostname":   opts.Hostname,
			},
			// Keep the container alive — sleep indefinitely so it acts like a VM.
			Cmd: []string{"sleep", "infinity"},
		},
		&container.HostConfig{
			Resources: container.Resources{
				Memory:   opts.Memory,
				CPUQuota: opts.CPUQuota,
			},
			// Grant network admin capabilities for chaos engineering (tc, iptables).
			CapAdd:        []string{"NET_ADMIN"},
			RestartPolicy: container.RestartPolicy{Name: "unless-stopped"},
		},
		&network.NetworkingConfig{
			EndpointsConfig: map[string]*network.EndpointSettings{
				opts.NetworkID: {
					Aliases: aliases,
				},
			},
		},
		nil,           // platform
		opts.Hostname, // container name = hostname for easy identification
	)
	if err != nil {
		return nil, fmt.Errorf("creating container %q: %w", opts.Hostname, err)
	}

	if err := c.api.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return nil, fmt.Errorf("starting container %q: %w", opts.Hostname, err)
	}

	// Inspect to get the assigned IP address.
	info, err := c.api.ContainerInspect(ctx, resp.ID)
	if err != nil {
		return nil, fmt.Errorf("inspecting container %q: %w", opts.Hostname, err)
	}

	ip := ""
	for _, ep := range info.NetworkSettings.Networks {
		if ep.IPAddress != "" {
			ip = ep.IPAddress
			break
		}
	}

	return &ContainerInfo{
		ID:       resp.ID,
		IP:       ip,
		Hostname: opts.Hostname,
	}, nil
}

// StopContainer stops a running container with a 10-second timeout.
func (c *Client) StopContainer(ctx context.Context, containerID string) error {
	timeout := 10
	if err := c.api.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("stopping container %q: %w", containerID, err)
	}
	return nil
}

// RemoveContainer forcefully removes a container. It stops the container first if running.
func (c *Client) RemoveContainer(ctx context.Context, containerID string) error {
	if err := c.api.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true}); err != nil {
		return fmt.Errorf("removing container %q: %w", containerID, err)
	}
	return nil
}

// StartContainer starts a stopped container.
func (c *Client) StartContainer(ctx context.Context, containerID string) error {
	if err := c.api.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return fmt.Errorf("starting container %q: %w", containerID, err)
	}
	return nil
}

// InspectContainer returns the full inspection data for a container.
func (c *Client) InspectContainer(ctx context.Context, containerID string) (ContainerState, error) {
	info, err := c.api.ContainerInspect(ctx, containerID)
	if err != nil {
		return ContainerState{}, fmt.Errorf("inspecting container %q: %w", containerID, err)
	}

	state := ContainerState{
		Running:    info.State.Running,
		Status:     info.State.Status,
		StartedAt:  info.State.StartedAt,
		FinishedAt: info.State.FinishedAt,
	}
	return state, nil
}

// ContainerState holds a subset of Docker container inspection state.
type ContainerState struct {
	// Running indicates whether the container process is running.
	Running bool `json:"running"`
	// Status is the Docker state string: "created", "running", "paused", "restarting", "removing", "exited", "dead".
	Status string `json:"status"`
	// StartedAt is the ISO 8601 timestamp when the container last started.
	StartedAt string `json:"started_at"`
	// FinishedAt is the ISO 8601 timestamp when the container last stopped.
	FinishedAt string `json:"finished_at"`
}

// ContainerLogs returns a ReadCloser streaming stdout and stderr from a container.
// The caller must close the returned reader.
func (c *Client) ContainerLogs(ctx context.Context, containerID string, follow bool) (io.ReadCloser, error) {
	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Since:      "0",
		Timestamps: true,
	}
	reader, err := c.api.ContainerLogs(ctx, containerID, opts)
	if err != nil {
		return nil, fmt.Errorf("fetching logs for container %q: %w", containerID, err)
	}
	return reader, nil
}
