package docker

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/network"
)

// CreateNetwork creates an isolated bridge network for a DistSim session.
// The name should be unique (e.g. "distsim-<session-id>"), and subnet is a
// CIDR block like "10.100.1.0/24".
func (c *Client) CreateNetwork(ctx context.Context, name, subnet string) (string, error) {
	resp, err := c.api.NetworkCreate(ctx, name, network.CreateOptions{
		Driver: "bridge",
		IPAM: &network.IPAM{
			Config: []network.IPAMConfig{
				{Subnet: subnet},
			},
		},
		Labels: map[string]string{
			"managed-by": "distsim",
			"network":    name,
		},
	})
	if err != nil {
		return "", fmt.Errorf("creating network %q: %w", name, err)
	}
	return resp.ID, nil
}

// RemoveNetwork deletes a Docker network by ID.
func (c *Client) RemoveNetwork(ctx context.Context, networkID string) error {
	if err := c.api.NetworkRemove(ctx, networkID); err != nil {
		return fmt.Errorf("removing network %q: %w", networkID, err)
	}
	return nil
}
