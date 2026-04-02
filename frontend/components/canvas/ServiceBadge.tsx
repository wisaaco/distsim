'use client';

import type { ServiceInst } from '@/lib/types';

const categoryColors: Record<string, string> = {
  database: 'border-purple-500/20',
  cache: 'border-orange-500/20',
  proxy: 'border-[#3b82f6]/15',
  messaging: 'border-green-500/20',
  search: 'border-amber-500/20',
  storage: 'border-teal-500/20',
  discovery: 'border-pink-500/20',
  security: 'border-red-500/20',
  observability: 'border-yellow-500/20',
  custom: 'border-[#2a2a2a]',
  tools: 'border-cyan-500/20',
};

const categoryText: Record<string, string> = {
  database: 'text-purple-300',
  cache: 'text-orange-300',
  proxy: 'text-[#60a5fa]',
  messaging: 'text-green-300',
  search: 'text-amber-300',
  storage: 'text-teal-300',
  discovery: 'text-pink-300',
  security: 'text-red-300',
  observability: 'text-yellow-300',
  custom: 'text-[#a1a1a1]',
  tools: 'text-cyan-300',
};

const typeToCategory: Record<string, string> = {
  nginx: 'proxy', postgresql: 'database', redis: 'cache', kafka: 'messaging',
  prometheus: 'observability', grafana: 'observability', jaeger: 'observability',
  custom_go: 'custom', custom_node: 'custom', custom_python: 'custom',
  go: 'custom', nodejs: 'custom', python: 'custom', api_tester: 'tools',
  mongodb: 'database', mysql: 'database', rabbitmq: 'messaging',
  memcached: 'cache', haproxy: 'proxy', minio: 'storage',
  etcd: 'database', consul: 'discovery', vault: 'security',
  nats: 'messaging', elasticsearch: 'search',
};

export function getCategoryForType(type: string): string {
  return typeToCategory[type.toLowerCase()] ?? 'custom';
}

export function isCustomService(type: string): boolean {
  const t = type.toLowerCase();
  return t.startsWith('custom_') || t === 'go' || t === 'nodejs' || t === 'python';
}

const statusDot: Record<string, string> = {
  running: 'bg-[#22c55e]',
  pending: 'bg-[#525252]',
  installing: 'bg-[#eab308] animate-pulse',
  stopped: 'bg-[#ef4444]',
  error: 'bg-[#ef4444]',
};

interface ServiceBadgeProps {
  service: ServiceInst;
  onClick?: (e: React.MouseEvent) => void;
  onRemove?: (e: React.MouseEvent) => void;
  onHelp?: (e: React.MouseEvent) => void;
  onInstall?: (e: React.MouseEvent) => void;
  onRun?: (e: React.MouseEvent) => void;
  onStop?: (e: React.MouseEvent) => void;
}

// Tiny icon button used in the action bar
function ActionBtn({ onClick, title, children, variant = 'default' }: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'danger';
}) {
  const styles = {
    default: 'text-[#525252] hover:text-[#a1a1a1] hover:bg-[#1f1f1f]',
    green: 'text-[#22c55e]/70 hover:text-[#22c55e] hover:bg-[#22c55e]/10',
    red: 'text-[#ef4444]/50 hover:text-[#ef4444] hover:bg-[#ef4444]/10',
    danger: 'text-[#525252] hover:text-[#ef4444] hover:bg-[#ef4444]/10',
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${styles[variant]}`}
      title={title}
    >
      {children}
    </button>
  );
}

// SVG icons at 8x8
const PlayIcon = <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2"><path d="M2 1l5 3-5 3V1z" /></svg>;
const StopIcon = <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2"><rect x="1.5" y="1.5" width="5" height="5" rx="0.5" /></svg>;
const ConfigIcon = <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2"><path d="M6.5 1h-5a.5.5 0 00-.5.5v5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-5a.5.5 0 00-.5-.5zM2 2.5h4M2 4h4M2 5.5h2.5" stroke="currentColor" strokeWidth="0.6" fill="none" /></svg>;
const HelpIcon = <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2"><path d="M4 0a4 4 0 100 8 4 4 0 000-8zm0 6a.5.5 0 110-1 .5.5 0 010 1zm.5-2.25a.5.5 0 01-1 0v-.5a.5.5 0 01.5-.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1a.5.5 0 01-1 0c0-1.1.9-2 2-2s2 .9 2 2c0 .88-.58 1.63-1.38 1.88a.17.17 0 00-.12.16v.46z" /></svg>;
const CloseIcon = <svg viewBox="0 0 8 8" fill="currentColor" className="h-2 w-2"><path d="M1.17 1.17a.5.5 0 01.7 0L4 3.3l2.13-2.13a.5.5 0 01.7.7L4.7 4l2.13 2.13a.5.5 0 01-.7.7L4 4.7 1.87 6.83a.5.5 0 01-.7-.7L3.3 4 1.17 1.87a.5.5 0 010-.7z" /></svg>;

export default function ServiceBadge({ service, onClick, onRemove, onHelp, onInstall, onRun, onStop }: ServiceBadgeProps) {
  const category = getCategoryForType(service.type);
  const borderColor = categoryColors[category] ?? categoryColors.custom;
  const textColor = categoryText[category] ?? categoryText.custom;
  const isApiTester = service.type === 'api_tester';
  const isCustom = isCustomService(service.type);
  const needsInstall = !service.installed && !isApiTester && !isCustom && service.status !== 'installing';
  const needsFirstRun = !service.installed && isCustom && service.status !== 'installing';
  const isInstalled = service.installed;
  const isRunning = service.status === 'running';
  const isStopped = service.status === 'stopped' || service.status === 'pending';
  const showRunStop = isInstalled && !isApiTester;

  return (
    <span className={`inline-flex items-center rounded border bg-[#0a0a0a] ${borderColor}`}>
      {/* Left: service name + status */}
      <span className={`flex items-center gap-1 px-1.5 py-[3px] text-[10px] font-medium ${textColor}`}>
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {service.status === 'running' && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-40" />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusDot[service.status] ?? 'bg-[#525252]'}`} />
        </span>
        <span>{service.type}</span>
      </span>

      {/* Right: action buttons */}
      <span className="flex items-center gap-px border-l border-[#1f1f1f] px-0.5 py-[1px]">
        {/* Install */}
        {needsInstall && onInstall && (
          <button
            onClick={(e) => { e.stopPropagation(); onInstall(e); }}
            className="rounded px-1.5 py-[2px] text-[9px] font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
          >
            Install
          </button>
        )}

        {/* Installing */}
        {service.status === 'installing' && (
          <span className="px-1 text-[9px] text-[#eab308]">installing</span>
        )}

        {/* Run (first run or restart) */}
        {((needsFirstRun || (showRunStop && isStopped)) && onRun) && (
          <ActionBtn onClick={onRun} title="Start service" variant="green">{PlayIcon}</ActionBtn>
        )}

        {/* Stop */}
        {showRunStop && isRunning && onStop && (
          <ActionBtn onClick={onStop} title="Stop service" variant="red">{StopIcon}</ActionBtn>
        )}

        {/* Configure */}
        {onClick && (
          <ActionBtn onClick={onClick} title="Configure" variant="default">{ConfigIcon}</ActionBtn>
        )}

        {/* Help */}
        {onHelp && (
          <ActionBtn onClick={onHelp} title="Help & docs" variant="default">{HelpIcon}</ActionBtn>
        )}

        {/* Remove */}
        {onRemove && service.status !== 'installing' && (
          <ActionBtn onClick={onRemove} title="Remove service" variant="danger">{CloseIcon}</ActionBtn>
        )}
      </span>
    </span>
  );
}
