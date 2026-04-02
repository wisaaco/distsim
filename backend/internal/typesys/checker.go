package typesys

import (
	"fmt"

	"github.com/hamidlabs/distsim/internal/domain"
)

// TypeError describes a single connection validation failure with a machine-readable
// code, a human-readable message, and a hint suggesting what the user should do instead.
type TypeError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Hint    string `json:"hint"`
}

// ValidationResult holds the outcome of a connection type check.
type ValidationResult struct {
	Valid  bool        `json:"valid"`
	Errors []TypeError `json:"errors,omitempty"`
}

// Checker validates connections between services using the type system registry.
type Checker struct{}

// NewChecker creates a new type checker.
func NewChecker() *Checker {
	return &Checker{}
}

// Validate checks whether a connection from one service (with a given role) to
// another service (with a given role) is type-safe. It returns a ValidationResult
// containing any protocol or role mismatches found.
func (c *Checker) Validate(from ServiceSpec, fromRole string, to ServiceSpec, toRole string) ValidationResult {
	var errs []TypeError

	// Rule 1: Find what the source consumes.
	// If the source has no dependencies at all, it cannot initiate connections.
	if len(from.Consumes) == 0 {
		errs = append(errs, NewTypeError(
			CodeNoMatchingEndpoint,
			fmt.Sprintf("%s does not consume any external services.", from.Type),
			fmt.Sprintf("Remove this connection. %s operates independently.", from.Type),
		))
		return ValidationResult{Valid: false, Errors: errs}
	}

	// Rule 2: Find an endpoint on the target that matches what the source consumes.
	// We need at least one dependency from `from` that matches an endpoint on `to`.
	matched := false
	for _, dep := range from.Consumes {
		for _, ep := range to.Exposes {
			if dep.Protocol == ep.Protocol {
				// Protocol matches. Now check role.
				if toRole != "" && ep.Role == toRole && dep.Role == toRole {
					matched = true
					break
				}
				if toRole == "" && dep.Role == ep.Role {
					matched = true
					break
				}
			}
		}
		if matched {
			break
		}
	}

	if !matched {
		// Try to give a specific error message for common mistakes.
		if specificErr := c.specificError(from, fromRole, to, toRole); specificErr != nil {
			errs = append(errs, *specificErr)
		} else {
			// Generate a generic but informative error.
			errs = append(errs, c.genericError(from, fromRole, to, toRole)...)
		}
	}

	if len(errs) > 0 {
		return ValidationResult{Valid: false, Errors: errs}
	}
	return ValidationResult{Valid: true}
}

// ValidateSelfConnection checks if a connection would create a self-loop
// (same machine and same service). This is checked separately because it
// requires machine-level information that the Checker doesn't have.
func (c *Checker) ValidateSelfConnection(fromNode, toNode, fromService, toService string) *TypeError {
	if fromNode == toNode && fromService == toService {
		te := NewTypeError(
			CodeSelfConnection,
			"A service cannot connect to itself on the same machine.",
			"Connect to a different machine or a different service.",
		)
		return &te
	}
	return nil
}

// specificError returns a tailored error for well-known incorrect connection patterns.
func (c *Checker) specificError(from ServiceSpec, fromRole string, to ServiceSpec, toRole string) *TypeError {
	// nginx -> kafka: HTTP vs binary protocol
	if from.Type == domain.ServiceNginx && to.Type == domain.ServiceKafka {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Nginx speaks HTTP. Kafka uses a binary protocol on port 9092. They cannot communicate directly.",
			"To access Kafka over HTTP, add a REST proxy service between them.",
		)
		return &te
	}

	// kafka -> nginx: same mismatch, other direction
	if from.Type == domain.ServiceKafka && to.Type == domain.ServiceNginx {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Kafka uses a binary protocol. Nginx speaks HTTP. They cannot communicate directly.",
			"Use a custom service as an intermediary that speaks both HTTP and Kafka.",
		)
		return &te
	}

	// nginx -> postgresql: HTTP vs PostgreSQL wire protocol
	if from.Type == domain.ServiceNginx && to.Type == domain.ServicePostgreSQL {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Nginx speaks HTTP but PostgreSQL uses its own wire protocol on port 5432.",
			"Connect an application service (Go, Node.js, Python) to PostgreSQL instead. Nginx should proxy to the application.",
		)
		return &te
	}

	// nginx -> redis: HTTP vs RESP protocol
	if from.Type == domain.ServiceNginx && to.Type == domain.ServiceRedis {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Nginx speaks HTTP but Redis uses the RESP protocol on port 6379.",
			"Connect an application service to Redis. Nginx should proxy HTTP traffic to the application.",
		)
		return &te
	}

	// postgresql(replica) -> redis: replication target mismatch
	if from.Type == domain.ServicePostgreSQL && fromRole == "replica" && to.Type == domain.ServiceRedis {
		te := NewTypeError(
			CodeProtocolMismatch,
			"PostgreSQL replication connects to another PostgreSQL primary, not Redis.",
			"Connect this PostgreSQL replica to a PostgreSQL primary for replication.",
		)
		return &te
	}

	// postgresql(replica) -> postgresql(replica): replica can't replicate from replica
	if from.Type == domain.ServicePostgreSQL && fromRole == "replica" &&
		to.Type == domain.ServicePostgreSQL && toRole == "replica" {
		te := NewTypeError(
			CodeRoleMismatch,
			"A PostgreSQL replica replicates from a primary, not from another replica.",
			"Connect this replica to a PostgreSQL instance with the \"primary\" role.",
		)
		return &te
	}

	// custom -> postgresql(replica) for writes
	if isCustomService(from.Type) && to.Type == domain.ServicePostgreSQL && toRole == "replica" {
		te := NewTypeError(
			CodeRoleMismatch,
			"This PostgreSQL is a read-only replica. It cannot accept writes.",
			"Connect to the PostgreSQL primary for read-write access, or use this replica for read-only queries.",
		)
		return &te
	}

	// grafana -> kafka: Grafana consumes HTTP (Prometheus query), not Kafka
	if from.Type == domain.ServiceGrafana && to.Type == domain.ServiceKafka {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Grafana queries data sources over HTTP. Kafka uses a binary protocol.",
			"Connect Grafana to Prometheus (its query API is HTTP-based) instead.",
		)
		return &te
	}

	// grafana -> redis
	if from.Type == domain.ServiceGrafana && to.Type == domain.ServiceRedis {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Grafana queries data sources over HTTP. Redis uses the RESP protocol.",
			"Connect Grafana to Prometheus or another HTTP-based data source.",
		)
		return &te
	}

	// grafana -> postgresql
	if from.Type == domain.ServiceGrafana && to.Type == domain.ServicePostgreSQL {
		te := NewTypeError(
			CodeProtocolMismatch,
			"Grafana queries data sources over HTTP. PostgreSQL uses its own wire protocol.",
			"Connect Grafana to Prometheus. If you need SQL access in Grafana, use a PostgreSQL datasource plugin (handled internally by Grafana).",
		)
		return &te
	}

	return nil
}

// genericError generates protocol/role mismatch errors by inspecting the
// actual protocols involved.
func (c *Checker) genericError(from ServiceSpec, fromRole string, to ServiceSpec, toRole string) []TypeError {
	var errs []TypeError

	// Collect protocols the source consumes.
	consumedProtos := make(map[domain.Protocol]string) // protocol -> required role
	for _, dep := range from.Consumes {
		consumedProtos[dep.Protocol] = dep.Role
	}

	// Collect protocols the target exposes.
	exposedProtos := make(map[domain.Protocol]string) // protocol -> role
	for _, ep := range to.Exposes {
		if toRole == "" || ep.Role == toRole {
			exposedProtos[ep.Protocol] = ep.Role
		}
	}

	// Check for protocol mismatch first.
	hasProtocolMatch := false
	for proto := range consumedProtos {
		if _, ok := exposedProtos[proto]; ok {
			hasProtocolMatch = true
			break
		}
	}

	if !hasProtocolMatch {
		errs = append(errs, NewTypeError(
			CodeProtocolMismatch,
			fmt.Sprintf("%s cannot connect to %s: no compatible protocol. %s consumes %s but %s exposes %s.",
				from.Type, to.Type,
				from.Type, protocolList(consumedProtos),
				to.Type, protocolList(exposedProtos),
			),
			fmt.Sprintf("Check which protocols %s exposes and ensure %s can consume one of them.", to.Type, from.Type),
		))
		return errs
	}

	// Protocol matches but role doesn't.
	for proto, requiredRole := range consumedProtos {
		if exposedRole, ok := exposedProtos[proto]; ok {
			if requiredRole != exposedRole {
				errs = append(errs, NewTypeError(
					CodeRoleMismatch,
					fmt.Sprintf("%s requires a %s endpoint with role %q, but %s exposes role %q.",
						from.Type, proto, requiredRole, to.Type, exposedRole),
					fmt.Sprintf("Connect to a %s instance that has the %q role.", to.Type, requiredRole),
				))
			}
		}
	}

	if len(errs) == 0 {
		errs = append(errs, NewTypeError(
			CodeNoMatchingEndpoint,
			fmt.Sprintf("%s has no endpoint that %s can consume with the specified roles.",
				to.Type, from.Type),
			"Verify the service roles and try a different target.",
		))
	}

	return errs
}

// protocolList formats a protocol map as a readable string.
func protocolList(protos map[domain.Protocol]string) string {
	if len(protos) == 0 {
		return "nothing"
	}
	result := ""
	i := 0
	for proto := range protos {
		if i > 0 {
			result += ", "
		}
		result += string(proto)
		i++
	}
	return result
}

// isCustomService returns true for custom_go, custom_node, custom_python.
func isCustomService(t domain.ServiceType) bool {
	return t == domain.ServiceCustomGo || t == domain.ServiceCustomNode || t == domain.ServiceCustomPython
}
