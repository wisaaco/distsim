package typesys

import "github.com/hamidlabs/distsim/internal/domain"

// Endpoint describes a single port+protocol+role that a service exposes.
type Endpoint struct {
	Port     int
	Protocol domain.Protocol
	Role     string // "primary", "replica", "broker", "http_server", "upstream", "server", "scraper", "query", "metrics"
}

// Dependency describes a protocol+role that a service needs to consume.
type Dependency struct {
	Protocol domain.Protocol
	Role     string // what role the target endpoint must have
	Required bool
}

// ServiceSpec defines the type-level contract of a service: what it exposes
// and what it consumes. The Checker uses these specs to validate connections.
type ServiceSpec struct {
	Type     domain.ServiceType
	Exposes  []Endpoint
	Consumes []Dependency
}

// Registry maps service types to their type-level specifications.
// It is initialized once at package load time.
var Registry map[domain.ServiceType]ServiceSpec

func init() {
	Registry = map[domain.ServiceType]ServiceSpec{
		domain.ServiceNginx: {
			Type: domain.ServiceNginx,
			Exposes: []Endpoint{
				{Port: 80, Protocol: domain.ProtocolHTTP, Role: "http_server"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolHTTP, Role: "http_server", Required: true},
			},
		},

		domain.ServicePostgreSQL: {
			Type: domain.ServicePostgreSQL,
			Exposes: []Endpoint{
				{Port: 5432, Protocol: domain.ProtocolPostgreSQL, Role: "primary"},
				{Port: 5432, Protocol: domain.ProtocolPostgreSQL, Role: "replica"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolPostgreSQL, Role: "primary", Required: false},
			},
		},

		domain.ServiceRedis: {
			Type: domain.ServiceRedis,
			Exposes: []Endpoint{
				{Port: 6379, Protocol: domain.ProtocolRedis, Role: "server"},
			},
			Consumes: []Dependency{},
		},

		domain.ServiceKafka: {
			Type: domain.ServiceKafka,
			Exposes: []Endpoint{
				{Port: 9092, Protocol: domain.ProtocolKafka, Role: "broker"},
			},
			Consumes: []Dependency{},
		},

		domain.ServicePrometheus: {
			Type: domain.ServicePrometheus,
			Exposes: []Endpoint{
				{Port: 9090, Protocol: domain.ProtocolHTTP, Role: "query"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolPrometheus, Role: "metrics", Required: true},
			},
		},

		domain.ServiceGrafana: {
			Type: domain.ServiceGrafana,
			Exposes: []Endpoint{
				{Port: 3000, Protocol: domain.ProtocolHTTP, Role: "http_server"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolHTTP, Role: "query", Required: true},
			},
		},

		domain.ServiceJaeger: {
			Type: domain.ServiceJaeger,
			Exposes: []Endpoint{
				{Port: 16686, Protocol: domain.ProtocolHTTP, Role: "query"},
			},
			Consumes: []Dependency{},
		},

		domain.ServiceCustomGo: {
			Type: domain.ServiceCustomGo,
			Exposes: []Endpoint{
				{Port: 8080, Protocol: domain.ProtocolHTTP, Role: "http_server"},
				{Port: 9090, Protocol: domain.ProtocolPrometheus, Role: "metrics"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolPostgreSQL, Role: "primary", Required: false},
				{Protocol: domain.ProtocolRedis, Role: "server", Required: false},
				{Protocol: domain.ProtocolKafka, Role: "broker", Required: false},
				{Protocol: domain.ProtocolHTTP, Role: "http_server", Required: false},
			},
		},

		domain.ServiceCustomNode: {
			Type: domain.ServiceCustomNode,
			Exposes: []Endpoint{
				{Port: 8080, Protocol: domain.ProtocolHTTP, Role: "http_server"},
				{Port: 9090, Protocol: domain.ProtocolPrometheus, Role: "metrics"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolPostgreSQL, Role: "primary", Required: false},
				{Protocol: domain.ProtocolRedis, Role: "server", Required: false},
				{Protocol: domain.ProtocolKafka, Role: "broker", Required: false},
				{Protocol: domain.ProtocolHTTP, Role: "http_server", Required: false},
			},
		},

		domain.ServiceCustomPython: {
			Type: domain.ServiceCustomPython,
			Exposes: []Endpoint{
				{Port: 8080, Protocol: domain.ProtocolHTTP, Role: "http_server"},
				{Port: 9090, Protocol: domain.ProtocolPrometheus, Role: "metrics"},
			},
			Consumes: []Dependency{
				{Protocol: domain.ProtocolPostgreSQL, Role: "primary", Required: false},
				{Protocol: domain.ProtocolRedis, Role: "server", Required: false},
				{Protocol: domain.ProtocolKafka, Role: "broker", Required: false},
				{Protocol: domain.ProtocolHTTP, Role: "http_server", Required: false},
			},
		},
	}
}
