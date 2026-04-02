// Package domain contains the core business types for DistSim.
package domain

// Protocol identifies the wire protocol used between services.
type Protocol string

const (
	// ProtocolHTTP represents HTTP/HTTPS connections.
	ProtocolHTTP Protocol = "http"
	// ProtocolPostgreSQL represents PostgreSQL wire protocol.
	ProtocolPostgreSQL Protocol = "postgresql"
	// ProtocolRedis represents the Redis RESP protocol.
	ProtocolRedis Protocol = "redis"
	// ProtocolKafka represents the Apache Kafka binary protocol.
	ProtocolKafka Protocol = "kafka"
	// ProtocolPrometheus represents the Prometheus scrape protocol (HTTP + metrics path).
	ProtocolPrometheus Protocol = "prometheus"
)

// ValidProtocols contains all recognised protocols for validation.
var ValidProtocols = map[Protocol]bool{
	ProtocolHTTP:       true,
	ProtocolPostgreSQL: true,
	ProtocolRedis:      true,
	ProtocolKafka:      true,
	ProtocolPrometheus: true,
}
