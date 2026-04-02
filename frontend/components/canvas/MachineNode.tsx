'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { Machine, MachineHealth } from '@/lib/types';
import { useTerminalStore } from '@/stores/terminal-store';
import { useServiceConfigStore } from '@/stores/service-config-store';
import { useSessionStore } from '@/stores/session-store';
import { useChaosStore } from '@/stores/chaos-store';
import { useHealthStore } from '@/stores/health-store';
import ServiceBadge from './ServiceBadge';
import ServiceHintPanel from './ServiceHintPanel';
import { apiPost } from '@/lib/api';
import ChaosEventBadge from '@/components/chaos/ChaosEventBadge';

type MachineNodeData = { machine: Machine };
type MachineNodeType = Node<MachineNodeData, 'machineNode'>;

const healthStyles: Record<MachineHealth, { border: string; dot: string; label: string }> = {
  healthy: { border: 'border-emerald-500/40', dot: 'bg-emerald-400', label: 'Running' },
  down:    { border: 'border-red-500/50', dot: 'bg-red-400', label: 'Down' },
  degraded:{ border: 'border-amber-500/50', dot: 'bg-amber-400', label: 'Degraded' },
  unknown: { border: 'border-[#2a2a2a]', dot: 'bg-gray-500', label: 'Unknown' },
};

function MachineNode({ data, selected }: NodeProps<MachineNodeType>) {
  const { machine } = data;
  const openTerminal = useTerminalStore((s) => s.openTerminal);
  const openConfig = useServiceConfigStore((s) => s.open);
  const removeService = useSessionStore((s) => s.removeService);
  const installService = useSessionStore((s) => s.installService);
  const removeMachine = useSessionStore((s) => s.removeMachine);
  const selectMachine = useChaosStore((s) => s.selectMachine);
  const setPanel = useChaosStore((s) => s.setPanel);
  const chaosEvents = useChaosStore((s) => s.events);
  const health = useHealthStore((s) => s.getHealth(machine.id));
  const [hintService, setHintService] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [ipCopied, setIpCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(machine.hostname);

  const machineEvents = useMemo(
    () => chaosEvents.filter((e) => e.machine_id === machine.id && e.status === 'active'),
    [chaosEvents, machine.id]
  );

  const style = healthStyles[health] ?? healthStyles.unknown;

  const handleOpenTerminal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openTerminal(machine.id, machine.hostname);
    },
    [machine.id, machine.hostname, openTerminal]
  );

  const handleChaosTarget = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectMachine({ id: machine.id, hostname: machine.hostname, ip: machine.ip });
      setPanel(true);
    },
    [machine.id, machine.hostname, machine.ip, selectMachine, setPanel]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectMachine({ id: machine.id, hostname: machine.hostname, ip: machine.ip });
      setPanel(true);
    },
    [machine.id, machine.hostname, machine.ip, selectMachine, setPanel]
  );

  const handleServiceClick = useCallback(
    (e: React.MouseEvent, serviceId: string, serviceType: string) => {
      e.stopPropagation();
      openConfig({
        sessionId: machine.session_id,
        machineId: machine.id,
        machineHostname: machine.hostname,
        serviceId,
        serviceType,
      });
    },
    [machine.session_id, machine.id, machine.hostname, openConfig]
  );

  const handleServiceRemove = useCallback(
    (e: React.MouseEvent, serviceId: string) => {
      e.stopPropagation();
      removeService(machine.session_id, machine.id, serviceId);
    },
    [machine.session_id, machine.id, removeService]
  );

  const fetchSession = useSessionStore((s) => s.fetchSession);

  // Helper to optimistically update a service's status in the local store.
  const updateLocalServiceStatus = useCallback(
    (svcType: string, status: 'running' | 'stopped' | 'installing' | 'pending') => {
      const session = useSessionStore.getState().session;
      if (!session) return;
      useSessionStore.setState({
        session: {
          ...session,
          machines: session.machines.map((m) =>
            m.id === machine.id
              ? {
                  ...m,
                  services: m.services.map((s) =>
                    s.type === svcType ? { ...s, status } : s
                  ),
                }
              : m
          ),
        },
      });
    },
    [machine.id]
  );

  const handleRunService = useCallback(
    async (e: React.MouseEvent, svcType: string) => {
      e.stopPropagation();

      // Find the service ID to use the Install endpoint for first run (creates file + starts)
      const svc = machine.services?.find((s) => s.type === svcType);
      if (svc && !svc.installed) {
        // First run — use Install endpoint which creates starter file + runs it
        updateLocalServiceStatus(svcType, 'installing');
        try {
          await installService(machine.session_id, machine.id, svc.id);
        } catch { /* ignore */ }
        return;
      }

      // Kill old process, then start via detached exec.
      const killCmds: Record<string, string> = {
        custom_node: 'pkill -f "node.*distsim/app" 2>/dev/null',
        custom_go: 'pkill -f "/home/distsim/app/service" 2>/dev/null',
        custom_python: 'pkill -f "python.*distsim/app" 2>/dev/null',
        nginx: 'nginx -s stop 2>/dev/null',
        postgresql: 'service postgresql stop 2>/dev/null',
        redis: 'redis-cli shutdown nosave 2>/dev/null',
        kafka: 'pkill -f socat 2>/dev/null',
        prometheus: 'pkill -f prometheus 2>/dev/null',
        grafana: 'pkill -f grafana 2>/dev/null; service grafana-server stop 2>/dev/null',
        jaeger: 'pkill -f jaeger 2>/dev/null',
        mongodb: 'pkill -f mongod 2>/dev/null',
        mysql: 'service mysql stop 2>/dev/null; pkill -f mysqld 2>/dev/null',
        rabbitmq: 'rabbitmqctl stop 2>/dev/null; pkill -f rabbitmq 2>/dev/null',
        memcached: 'pkill -f memcached 2>/dev/null',
        haproxy: 'pkill -f haproxy 2>/dev/null',
        minio: 'pkill -f minio 2>/dev/null',
        etcd: 'pkill -f etcd 2>/dev/null',
        consul: 'pkill -f consul 2>/dev/null',
        vault: 'pkill -f vault 2>/dev/null',
        nats: 'pkill -f nats-server 2>/dev/null',
        elasticsearch: 'pkill -f elasticsearch 2>/dev/null',
      };
      const startCmds: Record<string, string> = {
        custom_node: 'node /home/distsim/app/index.js',
        custom_go: 'cd /home/distsim/app && go build -o service main.go && ./service',
        custom_python: 'python3 /home/distsim/app/app.py',
        nginx: 'nginx',
        postgresql: 'service postgresql start',
        redis: 'redis-server --daemonize yes --bind 0.0.0.0 --protected-mode no && sleep 1',
        kafka: "socat TCP-LISTEN:9092,fork,reuseaddr SYSTEM:'echo Kafka'",
        prometheus: 'cd /tmp/prometheus-* 2>/dev/null && ./prometheus --config.file=prometheus.yml || echo "not installed"',
        grafana: 'service grafana-server start || echo "not installed"',
        jaeger: 'cd /tmp/jaeger-* 2>/dev/null && ./jaeger-all-in-one || echo "not installed"',
        mongodb: 'mongod --bind_ip_all --dbpath /data/db',
        mysql: 'mysqld --bind-address=0.0.0.0 --user=mysql',
        rabbitmq: 'rabbitmq-server',
        memcached: 'memcached -u root -l 0.0.0.0 -p 11211',
        haproxy: 'haproxy -f /etc/haproxy/haproxy.cfg -db',
        minio: 'MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin minio server /data/minio --console-address :9001',
        etcd: 'etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://0.0.0.0:2379',
        consul: 'consul agent -dev -client=0.0.0.0',
        vault: 'vault server -dev -dev-listen-address=0.0.0.0:8200',
        nats: 'nats-server -a 0.0.0.0',
        elasticsearch: "su elastic -c '/opt/elasticsearch/bin/elasticsearch -Expack.security.enabled=false -Ediscovery.type=single-node -Enetwork.host=0.0.0.0'",
      };
      const killCmd = killCmds[svcType];
      const startCmd = startCmds[svcType];
      if (!startCmd) return;
      // Services that daemonize themselves (nginx, pg, redis) use regular exec.
      // Long-running foreground services (node, go, python, prometheus, kafka, jaeger) use detached exec.
      const daemonized = new Set(['nginx', 'postgresql', 'redis', 'grafana', 'mysql']);
      const useDetached = !daemonized.has(svcType);

      updateLocalServiceStatus(svcType, 'running');
      try {
        if (killCmd) await apiPost(`/api/sessions/${machine.session_id}/machines/${machine.id}/exec`, { command: killCmd }).catch(() => {});
        if (useDetached) {
          await apiPost(`/api/sessions/${machine.session_id}/machines/${machine.id}/exec-detached`, { command: startCmd });
        } else {
          await apiPost(`/api/sessions/${machine.session_id}/machines/${machine.id}/exec`, { command: startCmd });
        }
      } catch { /* ignore */ }
    },
    [machine.session_id, machine.id, machine.services, updateLocalServiceStatus, installService]
  );

  const handleStopService = useCallback(
    async (e: React.MouseEvent, svcType: string) => {
      e.stopPropagation();
      // Reuse the same kill commands from handleRunService
      const cmd = ({
        custom_node: 'pkill -f "node.*distsim/app" 2>/dev/null',
        custom_go: 'pkill -f "/home/distsim/app/service" 2>/dev/null',
        custom_python: 'pkill -f "python.*distsim/app" 2>/dev/null',
        nginx: 'nginx -s stop 2>/dev/null',
        postgresql: 'service postgresql stop 2>/dev/null',
        redis: 'redis-cli shutdown nosave 2>/dev/null',
        kafka: 'pkill -f socat 2>/dev/null',
        prometheus: 'pkill -f prometheus 2>/dev/null',
        grafana: 'pkill -f grafana 2>/dev/null; service grafana-server stop 2>/dev/null',
        jaeger: 'pkill -f jaeger 2>/dev/null',
        mongodb: 'pkill -f mongod 2>/dev/null',
        mysql: 'service mysql stop 2>/dev/null; pkill -f mysqld 2>/dev/null',
        rabbitmq: 'rabbitmqctl stop 2>/dev/null; pkill -f rabbitmq 2>/dev/null',
        memcached: 'pkill -f memcached 2>/dev/null',
        haproxy: 'pkill -f haproxy 2>/dev/null',
        minio: 'pkill -f minio 2>/dev/null',
        etcd: 'pkill -f etcd 2>/dev/null',
        consul: 'pkill -f consul 2>/dev/null',
        vault: 'pkill -f vault 2>/dev/null',
        nats: 'pkill -f nats-server 2>/dev/null',
        elasticsearch: 'pkill -f elasticsearch 2>/dev/null',
      } as Record<string, string>)[svcType];
      if (!cmd) return;
      updateLocalServiceStatus(svcType, 'stopped');
      try {
        await apiPost(`/api/sessions/${machine.session_id}/machines/${machine.id}/exec`, { command: cmd });
      } catch { /* ignore */ }
    },
    [machine.session_id, machine.id, updateLocalServiceStatus]
  );

  const borderClass = selected
    ? 'border-[#22c55e]/60'
    : 'border-transparent hover:border-[#2a2a2a]';
  const isClient = machine.hostname === 'client';

  // Client icon (laptop/monitor) vs Server icon (rack)
  const MachineIcon = isClient ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75v-7.5Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v2A1.5 1.5 0 0116.5 7h-13A1.5 1.5 0 012 5.5v-2zM2.5 4a.5.5 0 01.5-.5h1a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm12 0a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" />
      <path d="M2 9a1.5 1.5 0 011.5-1.5h13A1.5 1.5 0 0118 9v2a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 11V9zm.5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm12 0a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" />
      <path d="M2 14.5A1.5 1.5 0 013.5 13h13a1.5 1.5 0 011.5 1.5v2a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 16.5v-2zm.5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm12 0a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" />
    </svg>
  );

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-xl border transition-all ${
        isClient ? 'bg-[#17171f]' : 'bg-[#141414]'
      } ${borderClass}`}
      onContextMenu={handleContextMenu}
    >
      {/* ─── Actions — top-right inside card ─── */}
      <div className="absolute top-1 right-1 z-10 flex items-center gap-px rounded-md border border-[#1f1f1f] bg-[#141414] p-0.5">
        <button onClick={handleOpenTerminal} className="rounded p-[3px] text-[#525252] transition-colors hover:bg-[#1f1f1f] hover:text-white" title="Terminal">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm6.146 5.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L8.793 6.5 6.146 9.146ZM2 9.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H2Z" />
          </svg>
        </button>
        {!isClient && (
          <button onClick={handleChaosTarget} className="rounded p-[3px] text-[#525252] transition-colors hover:bg-[#eab308]/10 hover:text-[#eab308]" title="Chaos">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M9.58 1.077a.75.75 0 0 1 .405.82L9.165 6h4.085a.75.75 0 0 1 .567 1.241l-6.5 7.5a.75.75 0 0 1-1.302-.638L6.835 10H2.75a.75.75 0 0 1-.567-1.241l6.5-7.5a.75.75 0 0 1 .897-.182Z" />
            </svg>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }} className="rounded p-[3px] text-[#525252] transition-colors hover:bg-[#1f1f1f] hover:text-[#a1a1a1]" title="Info">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${machine.hostname}"?`)) removeMachine(machine.session_id, machine.id); }} className="rounded p-[3px] text-[#525252] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]" title="Delete">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Connection handles — hidden for Client machines */}
      {!isClient && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#2a2a2a] !bg-gray-400 hover:!bg-[#22c55e]"
        />
      )}

      {/* ─── Header: top row with name + actions ─── */}
      <div className="px-2.5 pt-2 pb-1.5 pr-[90px]">
        {/* Row 1: hostname + action icons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isClient ? 'bg-[#1f1f2f] text-[#818cf8]' : 'bg-[#1f1f1f] text-[#525252]'}`}>
              {MachineIcon}
            </div>
            {renaming ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => setRenaming(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setRenaming(false);
                  if (e.key === 'Escape') { setRenameValue(machine.hostname); setRenaming(false); }
                }}
                className="w-20 rounded border border-[#22c55e] bg-[#0a0a0a] px-1 text-[11px] font-semibold text-white outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="truncate text-[11px] font-semibold text-white"
                onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}
                title="Double-click to rename"
              >
                {machine.hostname}
              </span>
            )}
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
            {machineEvents.length > 0 && <ChaosEventBadge events={machineEvents} />}
          </div>

        </div>

        {/* Row 2: IP address */}
        <div className="mt-0.5 flex items-center gap-1 pl-[26px]">
          <span className="font-mono text-[10px] text-[#22c55e]/60">{machine.ip}</span>
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(machine.ip); setIpCopied(true); setTimeout(() => setIpCopied(false), 1200); }}
            className={`rounded p-px transition-colors ${ipCopied ? 'text-[#22c55e]' : 'text-[#3a3a3a] hover:text-[#a1a1a1]'}`}
            title="Copy IP"
          >
            {ipCopied ? (
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-2 w-2">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-2 w-2">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-2.5 border-t border-[#1f1f1f]/50" />

      {/* ─── Machine info panel (expandable) ─── */}
      {showInfo && (
        <div className="border-b border-[#1f1f1f]/60 bg-[#0a0a0a]/50 px-3 py-2 text-[10px]">
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-[#525252]">Device ID</span>
            <span className="truncate font-mono text-[#525252]">{machine.id?.slice(0, 12)}</span>
            <span className="text-[#525252]">IP Address</span>
            <span className="font-mono text-[#525252]">{machine.ip}</span>
            <span className="text-[#525252]">OS</span>
            <span className="text-[#525252]">Linux (Ubuntu 22.04)</span>
            <span className="text-[#525252]">Status</span>
            <span className={`font-medium ${health === 'healthy' ? 'text-emerald-400' : health === 'down' ? 'text-red-400' : 'text-[#525252]'}`}>
              {style.label}
            </span>
            <span className="text-[#525252]">Services</span>
            <span className="text-[#525252]">{machine.services?.length ?? 0} installed</span>
            <span className="text-[#525252]">CPU / RAM</span>
            <span className="text-[#525252]">0.5 vCPU / 256 MB</span>
          </div>
        </div>
      )}

      {/* ─── Services ─── */}
      <div className="px-3 py-2">
        {machine.services && machine.services.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {machine.services.map((svc) => (
              <ServiceBadge
                key={svc.id}
                service={svc}
                onClick={(e) => handleServiceClick(e, svc.id, svc.type)}
                onRemove={(e) => handleServiceRemove(e, svc.id)}
                onHelp={(e) => { e.stopPropagation(); setHintService(svc.type); }}
                onInstall={(e) => { e.stopPropagation(); installService(machine.session_id, machine.id, svc.id); }}
                onRun={(e) => handleRunService(e, svc.type)}
                onStop={(e) => handleStopService(e, svc.type)}
              />
            ))}
          </div>
        ) : (
          <div className="py-1 text-center text-[10px] text-gray-600">
            Drop a service here
          </div>
        )}
      </div>


      {!isClient && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#2a2a2a] !bg-gray-400 hover:!bg-[#22c55e]"
        />
      )}

      {/* Service hint panel — rendered via portal */}
      {hintService && typeof document !== 'undefined' && createPortal(
        <ServiceHintPanel
          serviceType={hintService}
          onClose={() => setHintService(null)}
        />,
        document.body
      )}
    </div>
  );
}

export default memo(MachineNode);
