// Package docker wraps the Docker SDK client with DistSim-specific operations.
package docker

import (
	"context"
	"fmt"

	"github.com/docker/docker/client"
)

// Client wraps the Docker Engine SDK client and provides high-level
// operations for creating networks, containers, and managing session
// infrastructure.
type Client struct {
	api client.APIClient
}

// New creates a Docker client from the current environment.
// It respects DOCKER_HOST, DOCKER_TLS_VERIFY, and DOCKER_CERT_PATH.
func New() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("creating docker client: %w", err)
	}
	return &Client{api: cli}, nil
}

// Ping checks connectivity to the Docker daemon.
func (c *Client) Ping(ctx context.Context) error {
	_, err := c.api.Ping(ctx)
	if err != nil {
		return fmt.Errorf("pinging docker daemon: %w", err)
	}
	return nil
}

// Close releases resources held by the Docker client.
func (c *Client) Close() error {
	return c.api.Close()
}
