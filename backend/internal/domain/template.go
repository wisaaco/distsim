package domain

// TemplateDef describes a pre-configured environment blueprint that specifies
// which machines to create, what services each machine runs, and how those
// services are wired together.
type TemplateDef struct {
	// ID is the unique identifier used to select this template (e.g. "small").
	ID string `json:"id"`
	// Name is the human-readable display name.
	Name string `json:"name"`
	// Description briefly explains what this template contains.
	Description string `json:"description"`
	// Machines lists every machine the template creates.
	Machines []TemplateMachine `json:"machines"`
	// Connections lists the directed links between services on the template's machines.
	Connections []TemplateConnection `json:"connections"`
}

// TemplateMachine describes a single machine within a template, including
// which Docker image to use and which services to auto-install.
type TemplateMachine struct {
	// Hostname is the DNS-resolvable name inside the Docker network.
	Hostname string `json:"hostname"`
	// Image is the Docker image to use for this machine.
	Image string `json:"image"`
	// Services lists the service types to automatically install on this machine.
	Services []ServiceType `json:"services"`
}

// TemplateConnection describes a directed link between two services in the
// template, identified by hostname rather than machine ID (since IDs are
// generated at session-creation time).
type TemplateConnection struct {
	// FromHostname is the hostname of the source machine.
	FromHostname string `json:"from_hostname"`
	// FromService is the service type on the source machine.
	FromService string `json:"from_service"`
	// ToHostname is the hostname of the target machine.
	ToHostname string `json:"to_hostname"`
	// ToService is the service type on the target machine.
	ToService string `json:"to_service"`
	// Protocol is the wire protocol used for this connection.
	Protocol Protocol `json:"protocol"`
}

// TemplateRegistry holds all available template definitions, keyed by template ID.
var TemplateRegistry = map[string]TemplateDef{
	"small": {
		ID:          "small",
		Name:        "Small Company",
		Description: "3 machines — app server, database primary, database replica",
		Machines: []TemplateMachine{
			{
				Hostname: "app-server",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo, ServiceNginx},
			},
			{
				Hostname: "db-primary",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "db-replica",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "client",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceAPITester},
			},
		},
		Connections: []TemplateConnection{
			{
				FromHostname: "app-server",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-server",
				FromService:  "nginx",
				ToHostname:   "app-server",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "db-replica",
				FromService:  "postgresql",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
		},
	},
	"medium": {
		ID:          "medium",
		Name:        "Medium Company",
		Description: "10 machines — load balancer, 3 app servers, DB primary+replica, Redis, 3 Kafka brokers",
		Machines: []TemplateMachine{
			{
				Hostname: "lb",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceNginx},
			},
			{
				Hostname: "app-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-3",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "db-primary",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "db-replica",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "redis",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceRedis},
			},
			{
				Hostname: "kafka-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "kafka-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "kafka-3",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "client",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceAPITester},
			},
		},
		Connections: []TemplateConnection{
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-1",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-2",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-3",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			// All app servers → Redis
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "redis",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "redis",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "redis",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			// All app servers → Kafka (distributed across brokers)
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "kafka-1",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "kafka-2",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "kafka-3",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			// DB replication
			{
				FromHostname: "db-replica",
				FromService:  "postgresql",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
		},
	},
	"large": {
		ID:          "large",
		Name:        "Large Company",
		Description: "16 machines — full production stack with redundancy",
		Machines: []TemplateMachine{
			{
				Hostname: "lb",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceNginx},
			},
			{
				Hostname: "app-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-3",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-4",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "app-5",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceCustomGo},
			},
			{
				Hostname: "db-primary",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "db-replica-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "db-replica-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePostgreSQL},
			},
			{
				Hostname: "redis-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceRedis},
			},
			{
				Hostname: "redis-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceRedis},
			},
			{
				Hostname: "redis-3",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceRedis},
			},
			{
				Hostname: "kafka-1",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "kafka-2",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "kafka-3",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceKafka},
			},
			{
				Hostname: "observability",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServicePrometheus, ServiceGrafana},
			},
			{
				Hostname: "client",
				Image:    "distsim-base:latest",
				Services: []ServiceType{ServiceAPITester},
			},
		},
		Connections: []TemplateConnection{
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-1",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-2",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-3",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-4",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "lb",
				FromService:  "nginx",
				ToHostname:   "app-5",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-4",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-5",
				FromService:  "custom_go",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "redis-1",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "redis-2",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "redis-3",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-1",
				FromService:  "custom_go",
				ToHostname:   "kafka-1",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			{
				FromHostname: "app-2",
				FromService:  "custom_go",
				ToHostname:   "kafka-2",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			{
				FromHostname: "app-3",
				FromService:  "custom_go",
				ToHostname:   "kafka-3",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			// app-4, app-5 → redis
			{
				FromHostname: "app-4",
				FromService:  "custom_go",
				ToHostname:   "redis-1",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			{
				FromHostname: "app-5",
				FromService:  "custom_go",
				ToHostname:   "redis-2",
				ToService:    "redis",
				Protocol:     ProtocolRedis,
			},
			// app-4, app-5 → kafka
			{
				FromHostname: "app-4",
				FromService:  "custom_go",
				ToHostname:   "kafka-1",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			{
				FromHostname: "app-5",
				FromService:  "custom_go",
				ToHostname:   "kafka-2",
				ToService:    "kafka",
				Protocol:     ProtocolKafka,
			},
			// DB replication
			{
				FromHostname: "db-replica-1",
				FromService:  "postgresql",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			{
				FromHostname: "db-replica-2",
				FromService:  "postgresql",
				ToHostname:   "db-primary",
				ToService:    "postgresql",
				Protocol:     ProtocolPostgreSQL,
			},
			// Observability → scrapes all app servers
			{
				FromHostname: "observability",
				FromService:  "prometheus",
				ToHostname:   "app-1",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "observability",
				FromService:  "prometheus",
				ToHostname:   "app-2",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "observability",
				FromService:  "prometheus",
				ToHostname:   "app-3",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "observability",
				FromService:  "prometheus",
				ToHostname:   "app-4",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
			{
				FromHostname: "observability",
				FromService:  "prometheus",
				ToHostname:   "app-5",
				ToService:    "custom_go",
				Protocol:     ProtocolHTTP,
			},
		},
	},
	"custom": {
		ID:          "custom",
		Name:        "Custom",
		Description: "Blank canvas — build from scratch",
		Machines:    []TemplateMachine{},
		Connections: []TemplateConnection{},
	},
}
