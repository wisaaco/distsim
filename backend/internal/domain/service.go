package domain

// ServiceType identifies the kind of service that can be deployed on a machine.
type ServiceType string

const (
	// ServiceNginx is a reverse proxy / load balancer.
	ServiceNginx ServiceType = "nginx"
	// ServicePostgreSQL is a relational database.
	ServicePostgreSQL ServiceType = "postgresql"
	// ServiceRedis is an in-memory key-value store / cache.
	ServiceRedis ServiceType = "redis"
	// ServiceKafka is a distributed event streaming platform.
	ServiceKafka ServiceType = "kafka"
	// ServicePrometheus is a metrics collection and alerting system.
	ServicePrometheus ServiceType = "prometheus"
	// ServiceGrafana is a visualization and dashboarding tool.
	ServiceGrafana ServiceType = "grafana"
	// ServiceJaeger is a distributed tracing backend.
	ServiceJaeger ServiceType = "jaeger"
	// ServiceCustomNode is a user-defined Node.js application.
	ServiceCustomNode ServiceType = "custom_node"
	// ServiceCustomGo is a user-defined Go application.
	ServiceCustomGo ServiceType = "custom_go"
	// ServiceCustomPython is a user-defined Python application.
	ServiceCustomPython ServiceType = "custom_python"
	// ServiceAPITester is an HTTP API testing tool (like Postman).
	ServiceAPITester ServiceType = "api_tester"
	// ServiceMongoDB is a document database.
	ServiceMongoDB ServiceType = "mongodb"
	// ServiceMySQL is a relational database.
	ServiceMySQL ServiceType = "mysql"
	// ServiceRabbitMQ is an AMQP message broker.
	ServiceRabbitMQ ServiceType = "rabbitmq"
	// ServiceMemcached is an in-memory cache.
	ServiceMemcached ServiceType = "memcached"
	// ServiceHAProxy is a TCP/HTTP load balancer.
	ServiceHAProxy ServiceType = "haproxy"
	// ServiceMinIO is S3-compatible object storage.
	ServiceMinIO ServiceType = "minio"
	// ServiceEtcd is a distributed key-value store.
	ServiceEtcd ServiceType = "etcd"
	// ServiceConsul is a service discovery and KV store.
	ServiceConsul ServiceType = "consul"
	// ServiceVault is a secrets management tool.
	ServiceVault ServiceType = "vault"
	// ServiceNATS is a lightweight message broker.
	ServiceNATS ServiceType = "nats"
	// ServiceElasticsearch is a search and analytics engine.
	ServiceElasticsearch ServiceType = "elasticsearch"
)

// PortSpec describes a single port exposed or consumed by a service.
type PortSpec struct {
	// Port is the TCP/UDP port number.
	Port int `json:"port"`
	// Protocol is the wire protocol spoken on this port.
	Protocol Protocol `json:"protocol"`
	// Role describes how this port is used: "http_server", "primary", "replica", "broker", "scraper", etc.
	Role string `json:"role"`
}

// ServiceDef is the static definition of a service type in the registry.
// It describes the Docker image to use, what ports it exposes, and what
// protocols it can connect to.
type ServiceDef struct {
	// Type is the service type identifier.
	Type ServiceType `json:"type"`
	// DisplayName is the human-readable name shown in the UI.
	DisplayName string `json:"display_name"`
	// Icon is an emoji or icon name for the frontend toolbar.
	Icon string `json:"icon"`
	// Category groups related services: "proxy", "database", "cache", "messaging", "observability", "custom".
	Category string `json:"category"`
	// Image is the Docker image used when deploying this service.
	Image string `json:"image"`
	// DefaultPort is the primary port this service listens on.
	DefaultPort int `json:"default_port"`
	// Exposes lists all ports this service makes available.
	Exposes []PortSpec `json:"exposes"`
	// Consumes lists the protocols this service can connect TO as a client.
	Consumes []Protocol `json:"consumes"`
}

// ServiceInst is a running instance of a service on a specific machine.
type ServiceInst struct {
	// ID is a unique identifier for this service instance.
	ID string `json:"id"`
	// Type identifies which ServiceDef this instance was created from.
	Type ServiceType `json:"type"`
	// Status is the current state: "pending", "installing", "running", "stopped", "error".
	Status string `json:"status"`
	// Installed indicates whether the service software has been installed and started.
	Installed bool `json:"installed"`
}

// ServiceRegistry is the source of truth for what each service type exposes
// and consumes. The frontend reads this to populate the toolbar and validate
// connections.
var ServiceRegistry = map[ServiceType]ServiceDef{
	ServiceNginx: {
		Type:        ServiceNginx,
		DisplayName: "Nginx",
		Icon:        "🔀",
		Category:    "proxy",
		Image:       "nginx:alpine",
		DefaultPort: 80,
		Exposes: []PortSpec{
			{Port: 80, Protocol: ProtocolHTTP, Role: "http_server"},
			{Port: 443, Protocol: ProtocolHTTP, Role: "https_server"},
		},
		Consumes: []Protocol{ProtocolHTTP},
	},
	ServicePostgreSQL: {
		Type:        ServicePostgreSQL,
		DisplayName: "PostgreSQL",
		Icon:        "🐘",
		Category:    "database",
		Image:       "postgres:16-alpine",
		DefaultPort: 5432,
		Exposes: []PortSpec{
			{Port: 5432, Protocol: ProtocolPostgreSQL, Role: "primary"},
		},
		Consumes: []Protocol{ProtocolPostgreSQL},
	},
	ServiceRedis: {
		Type:        ServiceRedis,
		DisplayName: "Redis",
		Icon:        "🔴",
		Category:    "cache",
		Image:       "redis:7-alpine",
		DefaultPort: 6379,
		Exposes: []PortSpec{
			{Port: 6379, Protocol: ProtocolRedis, Role: "primary"},
		},
		Consumes: []Protocol{ProtocolRedis},
	},
	ServiceKafka: {
		Type:        ServiceKafka,
		DisplayName: "Kafka",
		Icon:        "📨",
		Category:    "messaging",
		Image:       "confluentinc/cp-kafka:7.6.0",
		DefaultPort: 9092,
		Exposes: []PortSpec{
			{Port: 9092, Protocol: ProtocolKafka, Role: "broker"},
		},
		Consumes: []Protocol{ProtocolKafka},
	},
	ServicePrometheus: {
		Type:        ServicePrometheus,
		DisplayName: "Prometheus",
		Icon:        "📊",
		Category:    "observability",
		Image:       "prom/prometheus:latest",
		DefaultPort: 9090,
		Exposes: []PortSpec{
			{Port: 9090, Protocol: ProtocolHTTP, Role: "http_server"},
		},
		Consumes: []Protocol{ProtocolPrometheus, ProtocolHTTP},
	},
	ServiceGrafana: {
		Type:        ServiceGrafana,
		DisplayName: "Grafana",
		Icon:        "📈",
		Category:    "observability",
		Image:       "grafana/grafana:latest",
		DefaultPort: 3000,
		Exposes: []PortSpec{
			{Port: 3000, Protocol: ProtocolHTTP, Role: "http_server"},
		},
		Consumes: []Protocol{ProtocolHTTP, ProtocolPrometheus},
	},
	ServiceJaeger: {
		Type:        ServiceJaeger,
		DisplayName: "Jaeger",
		Icon:        "🔍",
		Category:    "observability",
		Image:       "jaegertracing/all-in-one:latest",
		DefaultPort: 16686,
		Exposes: []PortSpec{
			{Port: 16686, Protocol: ProtocolHTTP, Role: "http_server"},
			{Port: 14268, Protocol: ProtocolHTTP, Role: "collector"},
		},
		Consumes: []Protocol{},
	},
	ServiceCustomGo: {
		Type:        ServiceCustomGo,
		DisplayName: "Go App",
		Icon:        "🐹",
		Category:    "custom",
		Image:       "distsim-base:latest",
		DefaultPort: 8080,
		Exposes: []PortSpec{
			{Port: 8080, Protocol: ProtocolHTTP, Role: "http_server"},
		},
		Consumes: []Protocol{ProtocolHTTP, ProtocolPostgreSQL, ProtocolRedis, ProtocolKafka},
	},
	ServiceCustomNode: {
		Type:        ServiceCustomNode,
		DisplayName: "Node.js App",
		Icon:        "🟢",
		Category:    "custom",
		Image:       "distsim-base:latest",
		DefaultPort: 3000,
		Exposes: []PortSpec{
			{Port: 3000, Protocol: ProtocolHTTP, Role: "http_server"},
		},
		Consumes: []Protocol{ProtocolHTTP, ProtocolPostgreSQL, ProtocolRedis, ProtocolKafka},
	},
	ServiceCustomPython: {
		Type:        ServiceCustomPython,
		DisplayName: "Python App",
		Icon:        "🐍",
		Category:    "custom",
		Image:       "distsim-base:latest",
		DefaultPort: 8000,
		Exposes: []PortSpec{
			{Port: 8000, Protocol: ProtocolHTTP, Role: "http_server"},
		},
		Consumes: []Protocol{ProtocolHTTP, ProtocolPostgreSQL, ProtocolRedis, ProtocolKafka},
	},
	ServiceAPITester: {
		Type:        ServiceAPITester,
		DisplayName: "API Tester",
		Icon:        "AT",
		Category:    "tools",
		Image:       "distsim-base:latest",
		DefaultPort: 0,
		Exposes:     []PortSpec{},
		Consumes:    []Protocol{ProtocolHTTP, ProtocolPostgreSQL, ProtocolRedis, ProtocolKafka},
	},
	ServiceMongoDB: {
		Type:        ServiceMongoDB,
		DisplayName: "MongoDB",
		Icon:        "Mg",
		Category:    "database",
		Image:       "distsim-base:latest",
		DefaultPort: 27017,
		Exposes:     []PortSpec{{Port: 27017, Protocol: "mongodb", Role: "primary"}},
		Consumes:    []Protocol{},
	},
	ServiceMySQL: {
		Type:        ServiceMySQL,
		DisplayName: "MySQL",
		Icon:        "My",
		Category:    "database",
		Image:       "distsim-base:latest",
		DefaultPort: 3306,
		Exposes:     []PortSpec{{Port: 3306, Protocol: "mysql", Role: "primary"}},
		Consumes:    []Protocol{},
	},
	ServiceRabbitMQ: {
		Type:        ServiceRabbitMQ,
		DisplayName: "RabbitMQ",
		Icon:        "Rb",
		Category:    "messaging",
		Image:       "distsim-base:latest",
		DefaultPort: 5672,
		Exposes:     []PortSpec{{Port: 5672, Protocol: "amqp", Role: "broker"}, {Port: 15672, Protocol: ProtocolHTTP, Role: "management"}},
		Consumes:    []Protocol{},
	},
	ServiceMemcached: {
		Type:        ServiceMemcached,
		DisplayName: "Memcached",
		Icon:        "Mc",
		Category:    "cache",
		Image:       "distsim-base:latest",
		DefaultPort: 11211,
		Exposes:     []PortSpec{{Port: 11211, Protocol: "memcached", Role: "server"}},
		Consumes:    []Protocol{},
	},
	ServiceHAProxy: {
		Type:        ServiceHAProxy,
		DisplayName: "HAProxy",
		Icon:        "HA",
		Category:    "proxy",
		Image:       "distsim-base:latest",
		DefaultPort: 80,
		Exposes:     []PortSpec{{Port: 80, Protocol: ProtocolHTTP, Role: "http_server"}},
		Consumes:    []Protocol{ProtocolHTTP},
	},
	ServiceMinIO: {
		Type:        ServiceMinIO,
		DisplayName: "MinIO",
		Icon:        "S3",
		Category:    "storage",
		Image:       "distsim-base:latest",
		DefaultPort: 9000,
		Exposes:     []PortSpec{{Port: 9000, Protocol: ProtocolHTTP, Role: "s3"}},
		Consumes:    []Protocol{},
	},
	ServiceEtcd: {
		Type:        ServiceEtcd,
		DisplayName: "etcd",
		Icon:        "Et",
		Category:    "database",
		Image:       "distsim-base:latest",
		DefaultPort: 2379,
		Exposes:     []PortSpec{{Port: 2379, Protocol: ProtocolHTTP, Role: "kv"}},
		Consumes:    []Protocol{},
	},
	ServiceConsul: {
		Type:        ServiceConsul,
		DisplayName: "Consul",
		Icon:        "Cs",
		Category:    "discovery",
		Image:       "distsim-base:latest",
		DefaultPort: 8500,
		Exposes:     []PortSpec{{Port: 8500, Protocol: ProtocolHTTP, Role: "discovery"}},
		Consumes:    []Protocol{},
	},
	ServiceVault: {
		Type:        ServiceVault,
		DisplayName: "Vault",
		Icon:        "Vt",
		Category:    "security",
		Image:       "distsim-base:latest",
		DefaultPort: 8200,
		Exposes:     []PortSpec{{Port: 8200, Protocol: ProtocolHTTP, Role: "secrets"}},
		Consumes:    []Protocol{},
	},
	ServiceNATS: {
		Type:        ServiceNATS,
		DisplayName: "NATS",
		Icon:        "Nt",
		Category:    "messaging",
		Image:       "distsim-base:latest",
		DefaultPort: 4222,
		Exposes:     []PortSpec{{Port: 4222, Protocol: "nats", Role: "broker"}},
		Consumes:    []Protocol{},
	},
	ServiceElasticsearch: {
		Type:        ServiceElasticsearch,
		DisplayName: "Elasticsearch",
		Icon:        "Es",
		Category:    "search",
		Image:       "distsim-base:latest",
		DefaultPort: 9200,
		Exposes:     []PortSpec{{Port: 9200, Protocol: ProtocolHTTP, Role: "search"}},
		Consumes:    []Protocol{},
	},
}
