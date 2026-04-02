// Package typesys provides compile-time-style connection validation for DistSim.
// It defines what each service type exposes and consumes, and validates that
// connections between services are protocol-compatible and role-compatible.
package typesys

// Error code constants used by the type checker.
const (
	// CodeProtocolMismatch indicates the source service speaks a different
	// wire protocol than the target service exposes.
	CodeProtocolMismatch = "PROTOCOL_MISMATCH"

	// CodeNoMatchingEndpoint indicates the target service does not expose
	// any endpoint that the source service can consume.
	CodeNoMatchingEndpoint = "NO_MATCHING_ENDPOINT"

	// CodeRoleMismatch indicates the target endpoint's role does not match
	// what the source dependency requires.
	CodeRoleMismatch = "ROLE_MISMATCH"

	// CodeSelfConnection indicates a service is trying to connect to itself
	// on the same machine.
	CodeSelfConnection = "SELF_CONNECTION"
)

// NewTypeError creates a TypeError with the given code, message, and hint.
func NewTypeError(code, message, hint string) TypeError {
	return TypeError{
		Code:    code,
		Message: message,
		Hint:    hint,
	}
}
