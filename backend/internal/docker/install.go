package docker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/hamidlabs/distsim/internal/domain"
)

// serviceSetup contains setup commands (run and wait) and a start command (run detached).
type serviceSetup struct {
	setup []string // commands that must complete before starting (apt-get, file creation, build)
	start string   // long-running command started detached (the actual service process)
}

var serviceSetups = map[domain.ServiceType]serviceSetup{
	domain.ServiceNginx: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq nginx > /dev/null 2>&1"},
		start: "nginx -g 'daemon off;'",
	},
	domain.ServicePostgreSQL: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq postgresql postgresql-client > /dev/null 2>&1"},
		start: "pg_ctlcluster 14 main start || service postgresql start",
	},
	domain.ServiceRedis: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq redis-server > /dev/null 2>&1"},
		start: "redis-server --protected-mode no --bind 0.0.0.0",
	},
	domain.ServiceKafka: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq socat > /dev/null 2>&1"},
		start: "socat TCP-LISTEN:9092,fork,reuseaddr SYSTEM:'echo Kafka placeholder'",
	},
	domain.ServicePrometheus: {
		start: "sh -c 'while true; do echo -e \"HTTP/1.1 200 OK\\r\\n\\r\\nprometheus\" | nc -l -p 9090 -q 1; done'",
	},
	domain.ServiceGrafana: {
		start: "sh -c 'while true; do echo -e \"HTTP/1.1 200 OK\\r\\n\\r\\ngrafana\" | nc -l -p 3000 -q 1; done'",
	},
	domain.ServiceJaeger: {
		start: "sh -c 'while true; do echo -e \"HTTP/1.1 200 OK\\r\\n\\r\\njaeger\" | nc -l -p 16686 -q 1; done'",
	},
	domain.ServiceCustomNode: {
		setup: []string{
			`test -f /home/distsim/app/index.js || cat > /home/distsim/app/index.js << 'NODEOF'
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok\n'); return; }
  res.end('Hello from Node.js!\n');
});
server.listen(8080, () => console.log('Listening on :8080'));
NODEOF`,
			"pkill -f 'node /home/distsim/app' 2>/dev/null || true",
		},
		start: "node /home/distsim/app/index.js",
	},
	domain.ServiceCustomGo: {
		setup: []string{
			"which go > /dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq golang > /dev/null 2>&1)",
			`test -f /home/distsim/app/main.go || cat > /home/distsim/app/main.go << 'GOOF'
package main
import ("fmt";"net/http")
func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { fmt.Fprintf(w, "Hello from Go!\n") })
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { fmt.Fprintf(w, "ok\n") })
	fmt.Println("Listening on :8080")
	http.ListenAndServe(":8080", nil)
}
GOOF`,
			"pkill -f '/home/distsim/app/service' 2>/dev/null || true",
			"cd /home/distsim/app && go build -o service main.go 2>&1",
		},
		start: "/home/distsim/app/service",
	},
	domain.ServiceMongoDB: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq gnupg curl > /dev/null 2>&1",
			"curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb.gpg 2>/dev/null",
			"echo 'deb [signed-by=/usr/share/keyrings/mongodb.gpg] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' > /etc/apt/sources.list.d/mongodb.list",
			"apt-get update -qq && apt-get install -y -qq mongodb-org > /dev/null 2>&1 || apt-get install -y -qq mongodb > /dev/null 2>&1"},
		start: "mongod --bind_ip_all --dbpath /data/db",
	},
	domain.ServiceMySQL: {
		setup: []string{"DEBIAN_FRONTEND=noninteractive apt-get update -qq && apt-get install -y -qq mysql-server > /dev/null 2>&1",
			"mkdir -p /var/run/mysqld && chown mysql:mysql /var/run/mysqld"},
		start: "mysqld --bind-address=0.0.0.0 --user=mysql",
	},
	domain.ServiceRabbitMQ: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq rabbitmq-server > /dev/null 2>&1"},
		start: "rabbitmq-server",
	},
	domain.ServiceMemcached: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq memcached > /dev/null 2>&1"},
		start: "memcached -u root -l 0.0.0.0 -p 11211",
	},
	domain.ServiceHAProxy: {
		setup: []string{"apt-get update -qq && apt-get install -y -qq haproxy > /dev/null 2>&1"},
		start: "haproxy -f /etc/haproxy/haproxy.cfg -db",
	},
	domain.ServiceMinIO: {
		setup: []string{"wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio && chmod +x /usr/local/bin/minio",
			"mkdir -p /data/minio"},
		start: "MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin minio server /data/minio --console-address :9001",
	},
	domain.ServiceEtcd: {
		setup: []string{
			"wget -q https://github.com/etcd-io/etcd/releases/download/v3.5.11/etcd-v3.5.11-linux-amd64.tar.gz -O /tmp/etcd.tar.gz",
			"tar xzf /tmp/etcd.tar.gz -C /usr/local/bin --strip-components=1 etcd-v3.5.11-linux-amd64/etcd etcd-v3.5.11-linux-amd64/etcdctl"},
		start: "etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://0.0.0.0:2379",
	},
	domain.ServiceConsul: {
		setup: []string{
			"wget -q https://releases.hashicorp.com/consul/1.17.1/consul_1.17.1_linux_amd64.zip -O /tmp/consul.zip",
			"apt-get update -qq && apt-get install -y -qq unzip > /dev/null 2>&1 && unzip -o /tmp/consul.zip -d /usr/local/bin > /dev/null"},
		start: "consul agent -dev -client=0.0.0.0",
	},
	domain.ServiceVault: {
		setup: []string{
			"wget -q https://releases.hashicorp.com/vault/1.15.4/vault_1.15.4_linux_amd64.zip -O /tmp/vault.zip",
			"apt-get update -qq && apt-get install -y -qq unzip > /dev/null 2>&1 && unzip -o /tmp/vault.zip -d /usr/local/bin > /dev/null"},
		start: "vault server -dev -dev-listen-address=0.0.0.0:8200",
	},
	domain.ServiceNATS: {
		setup: []string{
			"wget -q https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.tar.gz -O /tmp/nats.tar.gz",
			"tar xzf /tmp/nats.tar.gz -C /usr/local/bin --strip-components=1"},
		start: "nats-server -a 0.0.0.0",
	},
	domain.ServiceElasticsearch: {
		setup: []string{
			"apt-get update -qq && apt-get install -y -qq default-jdk wget > /dev/null 2>&1",
			"wget -q https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.3-linux-x86_64.tar.gz -O /tmp/es.tar.gz",
			"tar xzf /tmp/es.tar.gz -C /opt && mv /opt/elasticsearch-* /opt/elasticsearch",
			"useradd -r elastic 2>/dev/null; chown -R elastic:elastic /opt/elasticsearch"},
		start: "su elastic -c '/opt/elasticsearch/bin/elasticsearch -Expack.security.enabled=false -Ediscovery.type=single-node -Enetwork.host=0.0.0.0'",
	},
	domain.ServiceCustomPython: {
		setup: []string{
			`test -f /home/distsim/app/app.py || cat > /home/distsim/app/app.py << 'PYEOF'
from http.server import HTTPServer, BaseHTTPRequestHandler
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        if self.path == '/health': self.wfile.write(b'ok\n')
        else: self.wfile.write(b'Hello from Python!\n')
print('Listening on :8080')
HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
PYEOF`,
			"pkill -f 'python3 /home/distsim/app' 2>/dev/null || true",
		},
		start: "python3 /home/distsim/app/app.py",
	},
}

// InstallService installs and starts a service inside an existing container.
// Setup commands run sequentially and wait for completion.
// The start command runs detached so the service process stays alive.
func (c *Client) InstallService(ctx context.Context, containerID string, serviceType domain.ServiceType) error {
	ss, ok := serviceSetups[serviceType]
	if !ok {
		slog.Info("no auto-install for service type", "type", serviceType)
		return nil
	}

	// Run setup commands (wait for each to complete).
	for _, cmd := range ss.setup {
		slog.Info("installing service", "type", serviceType, "cmd", cmd[:min(len(cmd), 60)])
		output, exitCode, err := c.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
		if err != nil {
			return fmt.Errorf("setup failed for %s: %w", serviceType, err)
		}
		if exitCode != 0 {
			slog.Warn("setup command non-zero exit", "type", serviceType, "exit_code", exitCode, "output", output[:min(len(output), 200)])
		}
	}

	// Start the service detached (process stays alive after exec returns).
	if ss.start != "" {
		slog.Info("starting service detached", "type", serviceType, "cmd", ss.start[:min(len(ss.start), 60)])
		if err := c.ExecDetached(ctx, containerID, []string{"sh", "-c", ss.start}); err != nil {
			return fmt.Errorf("failed to start %s: %w", serviceType, err)
		}
	}

	slog.Info("service installed and started", "type", serviceType, "container", containerID[:12])
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
