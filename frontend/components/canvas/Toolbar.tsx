'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ServiceDef } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';
import ServiceHintPanel from './ServiceHintPanel';

const categoryOrder = [
  'proxy',
  'database',
  'cache',
  'messaging',
  'search',
  'storage',
  'discovery',
  'security',
  'observability',
  'custom',
  'tools',
];

const categoryLabels: Record<string, string> = {
  proxy: 'Proxy / LB',
  database: 'Database',
  cache: 'Cache',
  messaging: 'Messaging',
  search: 'Search',
  storage: 'Storage',
  discovery: 'Discovery',
  security: 'Security',
  observability: 'Observability',
  custom: 'Custom Code',
  tools: 'Tools',
};

const categoryIcons: Record<string, string> = {
  proxy: 'N',
  database: 'P',
  cache: 'R',
  messaging: 'K',
  observability: 'Pr',
  custom: 'C',
};

const fallbackServiceDefs: ServiceDef[] = [
  { type: 'nginx', display_name: 'Nginx', icon: 'N', category: 'proxy', image: 'nginx:latest', default_port: 80, exposes: [{ port: 80, protocol: 'HTTP', role: 'reverse-proxy' }], consumes: [] },
  { type: 'postgresql', display_name: 'PostgreSQL', icon: 'P', category: 'database', image: 'postgres:16', default_port: 5432, exposes: [{ port: 5432, protocol: 'PostgreSQL', role: 'database' }], consumes: [] },
  { type: 'redis', display_name: 'Redis', icon: 'R', category: 'cache', image: 'redis:7', default_port: 6379, exposes: [{ port: 6379, protocol: 'Redis', role: 'cache' }], consumes: [] },
  { type: 'kafka', display_name: 'Kafka', icon: 'K', category: 'messaging', image: 'confluentinc/cp-kafka:latest', default_port: 9092, exposes: [{ port: 9092, protocol: 'Kafka', role: 'broker' }], consumes: [] },
  { type: 'prometheus', display_name: 'Prometheus', icon: 'Pr', category: 'observability', image: 'prom/prometheus:latest', default_port: 9090, exposes: [{ port: 9090, protocol: 'HTTP', role: 'metrics' }], consumes: [] },
  { type: 'grafana', display_name: 'Grafana', icon: 'G', category: 'observability', image: 'grafana/grafana:latest', default_port: 3000, exposes: [{ port: 3000, protocol: 'HTTP', role: 'dashboard' }], consumes: [] },
  { type: 'jaeger', display_name: 'Jaeger', icon: 'J', category: 'observability', image: 'jaegertracing/all-in-one:latest', default_port: 16686, exposes: [{ port: 16686, protocol: 'HTTP', role: 'tracing' }], consumes: [] },
  { type: 'custom_go', display_name: 'Go Service', icon: 'Go', category: 'custom', image: 'golang:1.22', default_port: 8080, exposes: [{ port: 8080, protocol: 'HTTP', role: 'api' }], consumes: [] },
  { type: 'custom_node', display_name: 'Node.js', icon: 'Js', category: 'custom', image: 'node:20', default_port: 3000, exposes: [{ port: 3000, protocol: 'HTTP', role: 'api' }], consumes: [] },
  { type: 'custom_python', display_name: 'Python', icon: 'Py', category: 'custom', image: 'python:3.12', default_port: 8000, exposes: [{ port: 8000, protocol: 'HTTP', role: 'api' }], consumes: [] },
  // New services
  { type: 'mongodb', display_name: 'MongoDB', icon: 'Mg', category: 'database', image: '', default_port: 27017, exposes: [{ port: 27017, protocol: 'mongodb', role: 'primary' }], consumes: [] },
  { type: 'mysql', display_name: 'MySQL', icon: 'My', category: 'database', image: '', default_port: 3306, exposes: [{ port: 3306, protocol: 'mysql', role: 'primary' }], consumes: [] },
  { type: 'rabbitmq', display_name: 'RabbitMQ', icon: 'Rb', category: 'messaging', image: '', default_port: 5672, exposes: [{ port: 5672, protocol: 'amqp', role: 'broker' }], consumes: [] },
  { type: 'memcached', display_name: 'Memcached', icon: 'Mc', category: 'cache', image: '', default_port: 11211, exposes: [{ port: 11211, protocol: 'memcached', role: 'server' }], consumes: [] },
  { type: 'haproxy', display_name: 'HAProxy', icon: 'HA', category: 'proxy', image: '', default_port: 80, exposes: [{ port: 80, protocol: 'http', role: 'http_server' }], consumes: ['http'] },
  { type: 'minio', display_name: 'MinIO (S3)', icon: 'S3', category: 'storage', image: '', default_port: 9000, exposes: [{ port: 9000, protocol: 'http', role: 's3' }], consumes: [] },
  { type: 'etcd', display_name: 'etcd', icon: 'Et', category: 'database', image: '', default_port: 2379, exposes: [{ port: 2379, protocol: 'http', role: 'kv' }], consumes: [] },
  { type: 'consul', display_name: 'Consul', icon: 'Cs', category: 'discovery', image: '', default_port: 8500, exposes: [{ port: 8500, protocol: 'http', role: 'discovery' }], consumes: [] },
  { type: 'vault', display_name: 'Vault', icon: 'Vt', category: 'security', image: '', default_port: 8200, exposes: [{ port: 8200, protocol: 'http', role: 'secrets' }], consumes: [] },
  { type: 'nats', display_name: 'NATS', icon: 'Nt', category: 'messaging', image: '', default_port: 4222, exposes: [{ port: 4222, protocol: 'nats', role: 'broker' }], consumes: [] },
  { type: 'elasticsearch', display_name: 'Elasticsearch', icon: 'Es', category: 'search', image: '', default_port: 9200, exposes: [{ port: 9200, protocol: 'http', role: 'search' }], consumes: [] },
  // api_tester is pre-installed on Client machines, not drag-and-drop
];

const categoryColors: Record<string, string> = {
  proxy: 'border-[#3b82f6]/20 bg-[#3b82f6]/10 text-[#60a5fa]',
  database: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  cache: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  messaging: 'border-green-500/30 bg-green-500/10 text-green-300',
  search: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  storage: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  discovery: 'border-pink-500/30 bg-pink-500/10 text-pink-300',
  security: 'border-red-500/30 bg-red-500/10 text-red-300',
  observability: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  custom: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
  tools: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
};

interface ToolbarProps {
  collapsed: boolean;
  onToggle: () => void;
  sessionId: string;
  onDropService: (machineId: string, serviceType: string) => void;
  onAddMachine?: () => void;
}

export default function Toolbar({ collapsed, onToggle, sessionId, onDropService, onAddMachine }: ToolbarProps) {
  const serviceDefs = useSessionStore((s) => s.serviceDefs);
  const fetchServiceDefs = useSessionStore((s) => s.fetchServiceDefs);
  const [defs, setDefs] = useState<ServiceDef[]>([]);
  const dragDataRef = useRef<string>('');

  useEffect(() => {
    fetchServiceDefs();
  }, [fetchServiceDefs]);

  useEffect(() => {
    setDefs(serviceDefs.length > 0 ? serviceDefs : fallbackServiceDefs);
  }, [serviceDefs]);

  const groupedDefs = categoryOrder.reduce<Record<string, ServiceDef[]>>((acc, cat) => {
    const items = defs.filter((d) => d.category === cat);
    if (items.length > 0) {
      acc[cat] = items;
    }
    return acc;
  }, {});

  const handleDragStart = useCallback((e: React.DragEvent, serviceType: string) => {
    dragDataRef.current = serviceType;
    e.dataTransfer.setData('application/distsim-service', serviceType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const [hintService, setHintService] = useState<string | null>(null);

  // Expose sessionId and onDropService for parent to use
  void sessionId;
  void onDropService;

  return (
    <>
      {/* Expand button — visible when collapsed, positioned at right edge of canvas */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center border-l border-[#1f1f1f] bg-[#0a0a0a] text-[#525252] transition-colors hover:text-[#a1a1a1]"
          title="Show panel"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" />
          </svg>
        </button>
      )}
    <div
      className={`flex flex-col border-l border-[#1f1f1f] bg-[#0a0a0a] transition-all ${
        collapsed ? 'w-0 overflow-hidden border-l-0' : 'w-64'
      }`}
    >

      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* Collapse button */}
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-end px-3 py-2 text-[#525252] hover:text-[#a1a1a1]"
            title="Hide panel"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" />
            </svg>
          </button>
          <div className="px-3 pb-3">
          {/* Add Machine button — prominent */}
          {onAddMachine && (
            <button
              onClick={onAddMachine}
              className="mb-4 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-[#22c55e]/30 bg-[#22c55e]/5 py-4 text-[#22c55e]/70 transition-all hover:border-[#22c55e]/60 hover:bg-[#22c55e]/10 hover:text-[#22c55e]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-medium">Add Machine</span>
            </button>
          )}

          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Services
          </h3>

          {Object.entries(groupedDefs).map(([category, items]) => (
            <div key={category} className="mb-4">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#525252]">
                  {categoryIcons[category]}
                </span>
                <span className="text-xs font-medium text-[#a1a1a1]">
                  {categoryLabels[category] ?? category}
                </span>
              </div>

              <div className="space-y-1">
                {items.map((def) => (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, def.type)}
                    className={`group cursor-grab rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:brightness-125 active:cursor-grabbing ${
                      categoryColors[category] ?? categoryColors.custom
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{def.icon}</span>
                        <span>{def.display_name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setHintService(def.type);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="rounded-full p-0.5 text-[#525252] transition-colors hover:bg-[#141414] hover:text-[#a1a1a1]"
                        title={`Help for ${def.display_name}`}
                        draggable={false}
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 3a.75.75 0 011.5 0v.5a.75.75 0 01-1.5 0V4zM7 7a1 1 0 012 0v4a1 1 0 01-2 0V7z" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-0.5 text-[10px] opacity-60">
                      :{def.default_port}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {hintService && typeof document !== 'undefined' && createPortal(
        <ServiceHintPanel
          serviceType={hintService}
          onClose={() => setHintService(null)}
        />,
        document.body
      )}
    </div>
    </>
  );
}
