'use client';

import { useMemo } from 'react';
import type { ChaosEvent } from '@/lib/types';

const actionCategory: Record<string, 'network' | 'process' | 'resource'> = {
  network_delay: 'network',
  packet_loss: 'network',
  network_partition: 'network',
  kill_process: 'process',
  stop_machine: 'process',
  cpu_stress: 'resource',
  memory_stress: 'resource',
  fill_disk: 'resource',
};

const categoryColors: Record<string, string> = {
  network: 'bg-[#3b82f6]/20 text-[#93c5fd] border-[#3b82f6]/40',
  process: 'bg-[#ef4444]/20 text-[#fca5a5] border-[#ef4444]/40',
  resource: 'bg-[#eab308]/20 text-[#fde68a] border-[#eab308]/40',
};

function getCategoryForAction(action: string): 'network' | 'process' | 'resource' {
  return actionCategory[action] ?? 'network';
}

function formatParams(event: ChaosEvent): string {
  const parts: string[] = [];
  const p = event.params;
  switch (event.action) {
    case 'network_delay':
      if (p.delay) parts.push(`${p.delay}ms delay`);
      if (p.jitter) parts.push(`${p.jitter}ms jitter`);
      break;
    case 'packet_loss':
      if (p.loss) parts.push(`${p.loss}% loss`);
      break;
    case 'network_partition':
      if (p.target_id) parts.push(`partition`);
      break;
    case 'kill_process':
      if (p.process) parts.push(p.process);
      break;
    case 'stop_machine':
      parts.push('stopped');
      break;
    case 'cpu_stress':
      if (p.cores) parts.push(`${p.cores} cores`);
      if (p.duration) parts.push(`${p.duration}s`);
      break;
    case 'memory_stress':
      if (p.mb) parts.push(`${p.mb}MB`);
      if (p.duration) parts.push(`${p.duration}s`);
      break;
    case 'fill_disk':
      if (p.mb) parts.push(`${p.mb}MB`);
      break;
  }
  return parts.join(', ') || event.action;
}

interface ChaosEventBadgeProps {
  events: ChaosEvent[];
}

export default function ChaosEventBadge({ events }: ChaosEventBadgeProps) {
  const activeEvents = useMemo(
    () => events.filter((e) => e.status === 'active'),
    [events]
  );

  if (activeEvents.length === 0) return null;

  // Determine dominant category for color
  const categories = activeEvents.map((e) => getCategoryForAction(e.action));
  const dominant = categories[0];
  const colors = categoryColors[dominant] ?? categoryColors.network;

  return (
    <div className="group relative">
      <div
        className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${colors}`}
      >
        {/* Lightning bolt icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-2.5 w-2.5"
        >
          <path d="M9.58 1.077a.75.75 0 0 1 .405.82L9.165 6h4.085a.75.75 0 0 1 .567 1.241l-6.5 7.5a.75.75 0 0 1-1.302-.638L6.835 10H2.75a.75.75 0 0 1-.567-1.241l6.5-7.5a.75.75 0 0 1 .897-.182Z" />
        </svg>
        <span>{activeEvents.length}</span>
      </div>

      {/* Hover tooltip with event details */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-xs group-hover:block">
        <div className="mb-1 font-semibold text-white">
          Active Chaos Events
        </div>
        {activeEvents.map((event) => {
          const cat = getCategoryForAction(event.action);
          const catColor = categoryColors[cat];
          return (
            <div key={event.id} className="mt-1 flex items-center gap-2">
              <span
                className={`rounded px-1 py-px text-[10px] font-medium ${catColor}`}
              >
                {event.action.replace(/_/g, ' ')}
              </span>
              <span className="text-[#a1a1a1]">{formatParams(event)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { getCategoryForAction, formatParams, categoryColors };
