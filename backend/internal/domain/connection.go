package domain

// Connection represents a directed link between two services running on
// different (or the same) machines within a session.
type Connection struct {
	// ID is a unique identifier for this connection.
	ID string `json:"id"`
	// SessionID links this connection back to its parent session.
	SessionID string `json:"session_id"`
	// FromNode is the Machine ID of the source machine.
	FromNode string `json:"from_node"`
	// FromService is the service type running on the source machine.
	FromService string `json:"from_service"`
	// ToNode is the Machine ID of the target machine.
	ToNode string `json:"to_node"`
	// ToService is the service type running on the target machine.
	ToService string `json:"to_service"`
	// Protocol is the wire protocol used for this connection.
	Protocol Protocol `json:"protocol"`
	// Status is the current state: "active", "error".
	Status string `json:"status"`
}
