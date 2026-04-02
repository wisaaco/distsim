package docker

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
)

// CleanupOrphaned removes all DistSim containers and networks that were left
// behind from a previous server run. This happens because the in-memory session
// store loses state on restart, but Docker resources persist on disk.
// Returns the total number of resources cleaned up.
func (c *Client) CleanupOrphaned(ctx context.Context) (int, error) {
	cleaned := 0
	var firstErr error

	// 1. Remove all containers with the "managed-by=distsim" label.
	containers, err := c.api.ContainerList(ctx, container.ListOptions{
		All:     true,
		Filters: filters.NewArgs(filters.Arg("label", "managed-by=distsim")),
	})
	if err != nil {
		return 0, fmt.Errorf("listing distsim containers: %w", err)
	}

	for _, ctr := range containers {
		name := ""
		if len(ctr.Names) > 0 {
			name = strings.TrimPrefix(ctr.Names[0], "/")
		}
		if err := c.api.ContainerRemove(ctx, ctr.ID, container.RemoveOptions{Force: true}); err != nil {
			slog.Warn("failed to remove orphaned container", "id", ctr.ID[:12], "name", name, "error", err)
			if firstErr == nil {
				firstErr = err
			}
		} else {
			slog.Info("removed orphaned container", "id", ctr.ID[:12], "name", name)
			cleaned++
		}
	}

	// 2. Remove all networks with names starting with "distsim-".
	networks, err := c.api.NetworkList(ctx, network.ListOptions{
		Filters: filters.NewArgs(filters.Arg("name", "distsim-")),
	})
	if err != nil {
		return cleaned, fmt.Errorf("listing distsim networks: %w", err)
	}

	for _, net := range networks {
		if err := c.api.NetworkRemove(ctx, net.ID); err != nil {
			slog.Warn("failed to remove orphaned network", "id", net.ID[:12], "name", net.Name, "error", err)
			if firstErr == nil {
				firstErr = err
			}
		} else {
			slog.Info("removed orphaned network", "id", net.ID[:12], "name", net.Name)
			cleaned++
		}
	}

	return cleaned, firstErr
}
