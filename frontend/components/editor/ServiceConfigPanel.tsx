'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useServiceConfigStore } from '@/stores/service-config-store';
import { useEditorStore } from '@/stores/editor-store';
import { useSessionStore } from '@/stores/session-store';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { isCustomService } from '@/components/canvas/ServiceBadge';

// Default config templates for each service type
const CONFIG_TEMPLATES: Record<string, { path: string; filename: string; content: string; language: string }[]> = {
  nginx: [
    {
      path: '/etc/nginx/sites-enabled/default',
      filename: 'default (nginx site)',
      language: 'nginx',
      content: `server {
    listen 80 default_server;
    server_name _;

    location / {
        # Proxy to your app service
        # proxy_pass http://app-server:8080;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;

        return 200 'nginx is running\\n';
        add_header Content-Type text/plain;
    }

    location /health {
        return 200 'ok\\n';
        add_header Content-Type text/plain;
    }
}`,
    },
    {
      path: '/etc/nginx/nginx.conf',
      filename: 'nginx.conf (main)',
      language: 'nginx',
      content: `user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    sendfile on;
    keepalive_timeout 65;

    # Upstream backends — configure your app servers here
    # upstream app {
    #     server app-1:8080;
    #     server app-2:8080;
    #     server app-3:8080;
    # }

    include /etc/nginx/sites-enabled/*;
}`,
    },
  ],
  postgresql: [
    {
      path: '/etc/postgresql/14/main/postgresql.conf',
      filename: 'postgresql.conf',
      language: 'ini',
      content: `# PostgreSQL Configuration
listen_addresses = '*'
port = 5432
max_connections = 100

# Memory
shared_buffers = 128MB
work_mem = 4MB

# WAL / Replication
wal_level = replica
max_wal_senders = 3
hot_standby = on

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_statement = 'all'`,
    },
    {
      path: '/etc/postgresql/14/main/pg_hba.conf',
      filename: 'pg_hba.conf (access control)',
      language: 'conf',
      content: `# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 trust
host    all       all   0.0.0.0/0     md5
host    replication all 0.0.0.0/0     md5`,
    },
  ],
  redis: [
    {
      path: '/etc/redis/redis.conf',
      filename: 'redis.conf',
      language: 'conf',
      content: `# Redis Configuration
bind 0.0.0.0
port 6379
protected-mode no

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice`,
    },
  ],
  kafka: [
    {
      path: '/home/distsim/kafka/server.properties',
      filename: 'server.properties',
      language: 'properties',
      content: `# Kafka Broker Configuration
broker.id=1
listeners=PLAINTEXT://0.0.0.0:9092
advertised.listeners=PLAINTEXT://kafka-1:9092

# Log (data) directories
log.dirs=/tmp/kafka-logs
num.partitions=3
default.replication.factor=1

# Retention
log.retention.hours=168
log.segment.bytes=1073741824

# ZooKeeper (or KRaft)
# zookeeper.connect=zookeeper:2181`,
    },
  ],
  prometheus: [
    {
      path: '/etc/prometheus/prometheus.yml',
      filename: 'prometheus.yml',
      language: 'yaml',
      content: `global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'app-servers'
    static_configs:
      # Add your service endpoints here
      # - targets: ['app-1:8080', 'app-2:8080']

  - job_name: 'self'
    static_configs:
      - targets: ['localhost:9090']`,
    },
  ],
  grafana: [
    {
      path: '/etc/grafana/provisioning/datasources/datasource.yml',
      filename: 'datasource.yml',
      language: 'yaml',
      content: `apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    # Update this URL to your Prometheus machine
    url: http://observability:9090
    isDefault: true`,
    },
  ],
};

// Custom service starter templates
const CUSTOM_TEMPLATES: Record<string, { path: string; filename: string; content: string; language: string }> = {
  custom_go: {
    path: '/home/distsim/app/main.go',
    filename: 'main.go',
    language: 'go',
    content: `package main

import (
\t"fmt"
\t"net/http"
)

func main() {
\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
\t\tfmt.Fprintf(w, "Hello from Go service!\\n")
\t})

\thttp.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
\t\tfmt.Fprintf(w, "ok\\n")
\t})

\tfmt.Println("Listening on :8080")
\thttp.ListenAndServe(":8080", nil)
}`,
  },
  custom_node: {
    path: '/home/distsim/app/index.js',
    filename: 'index.js',
    language: 'javascript',
    content: `const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.end('ok\\n');
    return;
  }
  res.end('Hello from Node.js service!\\n');
});

server.listen(8080, () => {
  console.log('Listening on :8080');
});`,
  },
  custom_python: {
    path: '/home/distsim/app/app.py',
    filename: 'app.py',
    language: 'python',
    content: `from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        if self.path == '/health':
            self.wfile.write(b'ok\\n')
        else:
            self.wfile.write(b'Hello from Python service!\\n')

print('Listening on :8080')
HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()`,
  },
};

export default function ServiceConfigPanel() {
  const target = useServiceConfigStore((s) => s.target);
  const close = useServiceConfigStore((s) => s.close);
  const openEditor = useEditorStore((s) => s.openEditor);

  const [activeFile, setActiveFile] = useState(0);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  // Dynamically import Monaco to avoid SSR issues
  useEffect(() => {
    import('@monaco-editor/react').then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);

  const configs = useMemo(() => {
    if (!target) return [];
    const svcType = target.serviceType.toLowerCase();

    // Custom services → open code editor instead
    if (isCustomService(svcType)) {
      const tmpl = CUSTOM_TEMPLATES[svcType];
      return tmpl ? [tmpl] : [];
    }

    return CONFIG_TEMPLATES[svcType] ?? [];
  }, [target]);

  // Load file content when switching files
  useEffect(() => {
    if (!target || configs.length === 0) return;
    const config = configs[activeFile];
    if (!config) return;

    setLoading(true);
    apiGet<{ content: string }>(`/api/sessions/${target.sessionId}/machines/${target.machineId}/files?path=${encodeURIComponent(config.path)}`)
      .then((data) => {
        // Use template if file is empty or doesn't have real content
        if (data.content && data.content.trim().length > 0) {
          setContent(data.content);
        } else {
          setContent(config.content);
        }
      })
      .catch(() => {
        // File doesn't exist yet — use template
        setContent(config.content);
      })
      .finally(() => setLoading(false));
  }, [target, activeFile, configs]);

  const handleSave = useCallback(async () => {
    if (!target || configs.length === 0) return;
    const config = configs[activeFile];
    if (!config) return;

    setSaving(true);
    setOutput('');
    try {
      await apiPut(`/api/sessions/${target.sessionId}/machines/${target.machineId}/files`, {
        path: config.path,
        content,
      });
      setOutput(`Saved to ${config.path}`);
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Save failed'}`);
    } finally {
      setSaving(false);
    }
  }, [target, activeFile, configs, content]);

  const handleReload = useCallback(async () => {
    if (!target) return;
    const svcType = target.serviceType.toLowerCase();

    setOutput('Reloading service...');
    try {
      let cmd = '';
      if (svcType === 'nginx') cmd = 'nginx -s reload 2>&1 || nginx 2>&1';
      else if (svcType === 'postgresql') cmd = 'pg_ctlcluster 14 main reload 2>&1 || service postgresql restart 2>&1';
      else if (svcType === 'redis') cmd = 'redis-cli config rewrite 2>&1';
      else if (svcType === 'mysql') cmd = 'service mysql restart 2>&1';
      else cmd = `echo "No reload command for ${svcType}"`;

      const result = await apiPost<{ output: string; exit_code: number }>(
        `/api/sessions/${target.sessionId}/machines/${target.machineId}/exec`,
        { command: cmd }
      );

      const success = result.exit_code === 0;
      setOutput(result.output || (success ? 'Reloaded successfully' : `Exit code: ${result.exit_code}`));

      // Update service status in the store so the badge reflects it.
      const session = useSessionStore.getState().session;
      if (session) {
        useSessionStore.setState({
          session: {
            ...session,
            machines: session.machines.map((m) =>
              m.id === target.machineId
                ? {
                    ...m,
                    services: m.services.map((s) =>
                      s.id === target.serviceId
                        ? { ...s, status: success ? 'running' as const : 'error' as const, installed: success || s.installed }
                        : s
                    ),
                  }
                : m
            ),
          },
        });
      }
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Reload failed'}`);
    }
  }, [target]);

  if (!target) return null;

  // For custom services, open code editor directly — no prompt.
  if (isCustomService(target.serviceType)) {
    openEditor(target.machineId, target.machineHostname);
    close();
    return null;
  }

  if (configs.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" onClick={close} />
        <div className="relative z-10 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <p className="text-sm text-[#a1a1a1]">No configuration files available for {target.serviceType}.</p>
          <button onClick={close} className="mt-4 rounded-md border border-[#2a2a2a] px-4 py-2 text-sm text-white hover:bg-[#0a0a0a]">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fixed inset-0 bg-black/70" onClick={close} />
      <div className="relative z-10 mx-auto mt-12 flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#141414]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {target.serviceType.toUpperCase()} Config
            </span>
            <span className="text-xs text-[#525252]">on {target.machineHostname}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#22c55e] px-3 py-1 text-xs font-medium text-black hover:bg-[#16a34a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleReload}
              className="rounded-md border border-[#2a2a2a] px-3 py-1 text-xs font-medium text-white hover:bg-[#0a0a0a]"
            >
              Reload Service
            </button>
            <button
              onClick={close}
              className="rounded p-1 text-[#525252] hover:bg-[#0a0a0a] hover:text-[#a1a1a1]"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
        </div>

        {/* File tabs */}
        {configs.length > 1 && (
          <div className="flex border-b border-[#1f1f1f]">
            {configs.map((cfg, i) => (
              <button
                key={cfg.path}
                onClick={() => setActiveFile(i)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  i === activeFile
                    ? 'border-b-2 border-[#22c55e] text-white'
                    : 'text-[#525252] hover:text-[#a1a1a1]'
                }`}
              >
                {cfg.filename}
              </button>
            ))}
          </div>
        )}

        {/* File path */}
        <div className="border-b border-[#1f1f1f] px-4 py-1.5">
          <span className="font-mono text-[11px] text-[#525252]">{configs[activeFile]?.path}</span>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#525252]">Loading...</div>
          ) : MonacoEditor ? (
            <MonacoEditor
              height="100%"
              language={configs[activeFile]?.language ?? 'plaintext'}
              theme="vs-dark"
              value={content}
              onChange={(value: string | undefined) => setContent(value ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
              }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-full w-full resize-none bg-[#0a0a0a] p-4 font-mono text-sm text-[#fafafa] outline-none"
              spellCheck={false}
            />
          )}
        </div>

        {/* Output */}
        {output && (
          <div className="border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 py-2">
            <pre className="font-mono text-xs text-[#a1a1a1]">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
