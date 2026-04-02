// Package domain contains the core business types for DistSim.
package domain

// Machine represents a single virtual machine (Docker container) within a session.
type Machine struct {
	// ID is a unique identifier for this machine within DistSim.
	ID string `json:"id"`
	// Hostname is the DNS-resolvable name inside the Docker network.
	Hostname string `json:"hostname"`
	// IP is the container's IP address within the session network.
	IP string `json:"ip"`
	// ContainerID is the Docker container ID backing this machine.
	ContainerID string `json:"container_id"`
	// Image is the Docker image this machine was created from.
	Image string `json:"image"`
	// Status is the current state: "running", "stopped", "creating", "error".
	Status string `json:"status"`
	// Services is the list of service instances running on this machine.
	Services []ServiceInst `json:"services"`
	// PositionX is the machine's X coordinate on the frontend canvas.
	PositionX float64 `json:"position_x"`
	// PositionY is the machine's Y coordinate on the frontend canvas.
	PositionY float64 `json:"position_y"`
	// SessionID links this machine back to its parent session.
	SessionID string `json:"session_id"`
}
