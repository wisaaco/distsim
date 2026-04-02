'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useChaosStore } from '@/stores/chaos-store';
import { useSessionStore } from '@/stores/session-store';
import ChaosActionCard from './ChaosActionCard';
import {
  getCategoryForAction,
  formatParams,
  categoryColors,
} from './ChaosEventBadge';

interface ChaosPanelProps {
  sessionId: string;
}

export default function ChaosPanel({ sessionId }: ChaosPanelProps) {
  const panelOpen = useChaosStore((s) => s.panelOpen);
  const selectedMachine = useChaosStore((s) => s.selectedMachine);
  const events = useChaosStore((s) => s.events);
  const loading = useChaosStore((s) => s.loading);
  const fetchEvents = useChaosStore((s) => s.fetchEvents);
  const injectChaos = useChaosStore((s) => s.injectChaos);
  const revertChaos = useChaosStore((s) => s.revertChaos);
  const revertAll = useChaosStore((s) => s.revertAll);
  const togglePanel = useChaosStore((s) => s.togglePanel);

  const session = useSessionStore((s) => s.session);

  const machines = useMemo(
    () =>
      (session?.machines ?? []).map((m) => ({
        id: m.id,
        hostname: m.hostname,
      })),
    [session?.machines]
  );

  useEffect(() => {
    fetchEvents(sessionId);
    const interval = setInterval(() => fetchEvents(sessionId), 5000);
    return () => clearInterval(interval);
  }, [sessionId, fetchEvents]);

  const activeEvents = useMemo(
    () => events.filter((e) => e.status === 'active'),
    [events]
  );

  const handleInject = useCallback(
    (action: string) => (params: Record<string, string>) => {
      if (!selectedMachine) return;
      injectChaos(sessionId, selectedMachine.id, action, params);
    },
    [sessionId, selectedMachine, injectChaos]
  );

  const handleRevert = useCallback(
    (eventId: string) => {
      revertChaos(sessionId, eventId);
    },
    [sessionId, revertChaos]
  );

  const handleRevertAll = useCallback(() => {
    if (!confirm('Revert all active chaos events?')) return;
    revertAll(sessionId);
  }, [sessionId, revertAll]);

  if (!panelOpen) return null;

  const noTarget = !selectedMachine;

  return (
    <div className="flex w-80 flex-col border-l border-[#1f1f1f] bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4 text-yellow-400"
          >
            <path d="M9.58 1.077a.75.75 0 0 1 .405.82L9.165 6h4.085a.75.75 0 0 1 .567 1.241l-6.5 7.5a.75.75 0 0 1-1.302-.638L6.835 10H2.75a.75.75 0 0 1-.567-1.241l6.5-7.5a.75.75 0 0 1 .897-.182Z" />
          </svg>
          <h2 className="text-sm font-semibold text-white">
            Chaos Engineering
          </h2>
        </div>
        <button
          onClick={togglePanel}
          className="rounded p-1 text-[#525252] transition-colors hover:bg-[#141414] hover:text-[#a1a1a1]"
          title="Close panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>

      {/* Target display */}
      <div className="border-b border-[#1f1f1f] px-4 py-2.5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#525252]">
          Target
        </div>
        {selectedMachine ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm font-medium text-white">
              {selectedMachine.hostname}
            </span>
            <span className="font-mono text-xs text-[#22c55e]">
              {selectedMachine.ip}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-[#525252]">
            Right-click or click the bolt icon on a machine node to target it
          </div>
        )}
      </div>

      {/* Scrollable action cards */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1a1]">
          Network
        </div>

        <ChaosActionCard
          title="Network Delay"
          description="Add latency to network traffic on the target machine"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#a1a1a1]">
              <path d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" />
            </svg>
          }
          category="network"
          controls={[
            { type: 'slider', key: 'delay', label: 'Delay', min: 50, max: 2000, step: 50, unit: 'ms', default: 200 },
            { type: 'slider', key: 'jitter', label: 'Jitter', min: 0, max: 500, step: 10, unit: 'ms', default: 50 },
          ]}
          buttonLabel="Inject Delay"
          disabled={noTarget}
          onInject={handleInject('network_delay')}
        />

        <ChaosActionCard
          title="Packet Loss"
          description="Drop a percentage of network packets"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#a1a1a1]">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm4-7a.75.75 0 0 0-.75-.75h-6.5a.75.75 0 0 0 0 1.5h6.5A.75.75 0 0 0 12 8Z" clipRule="evenodd" />
            </svg>
          }
          category="network"
          controls={[
            { type: 'slider', key: 'loss', label: 'Loss %', min: 1, max: 100, step: 1, unit: '%', default: 10 },
          ]}
          buttonLabel="Inject Loss"
          disabled={noTarget}
          onInject={handleInject('packet_loss')}
        />

        <ChaosActionCard
          title="Network Partition"
          description="Block traffic between this machine and another"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#a1a1a1]">
              <path d="M2.87 2.298a.75.75 0 0 0-.812 1.262L3.75 4.69v3.56a.75.75 0 0 0 1.5 0V5.657l1.75 1.125V10a.75.75 0 0 0 1.5 0V7.907l3.558 2.289a.75.75 0 0 0 .812-1.262l-10-6.436Z" />
            </svg>
          }
          category="network"
          controls={[
            { type: 'machine-select', key: 'target_id', label: 'Partition from' },
          ]}
          buttonLabel="Partition"
          disabled={noTarget}
          machines={machines}
          currentMachineId={selectedMachine?.id}
          onInject={handleInject('network_partition')}
        />

        <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-red-400">
          Process
        </div>

        <ChaosActionCard
          title="Kill Process"
          description="Kill a running process by name inside the container"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
            </svg>
          }
          category="process"
          controls={[
            { type: 'input', key: 'process', label: 'Process name', placeholder: 'e.g. nginx, node, redis-server' },
          ]}
          buttonLabel="Kill Process"
          buttonVariant="danger"
          disabled={noTarget}
          onInject={handleInject('kill_process')}
        />

        <ChaosActionCard
          title="Stop Machine"
          description="Stop the container entirely — simulates machine failure"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
              <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v7A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 11.5 2h-7Z" />
            </svg>
          }
          category="process"
          controls={[]}
          buttonLabel="Stop Container"
          buttonVariant="danger"
          confirmMessage="This will stop the container. The machine will go offline. Continue?"
          disabled={noTarget}
          onInject={handleInject('stop_machine')}
        />

        <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
          Resource
        </div>

        <ChaosActionCard
          title="CPU Stress"
          description="Consume CPU cores to simulate high load"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-yellow-400">
              <path d="M5 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 7.75v-4.5ZM2.5 8a.75.75 0 0 0 0 1.5h1.768a2 2 0 0 0 1.932 1.482V12.5a.75.75 0 0 0 1.5 0v-1.518A2 2 0 0 0 9.632 9.5H11.5a.75.75 0 0 0 0-1.5H9.632A2 2 0 0 0 7.7 6.518V5a.75.75 0 0 0-1.5 0v1.518A2 2 0 0 0 4.268 8H2.5Z" />
            </svg>
          }
          category="resource"
          controls={[
            { type: 'slider', key: 'cores', label: 'CPU Cores', min: 1, max: 4, step: 1, unit: '', default: 1 },
            { type: 'slider', key: 'duration', label: 'Duration', min: 10, max: 120, step: 5, unit: 's', default: 30 },
          ]}
          buttonLabel="Stress CPU"
          disabled={noTarget}
          onInject={handleInject('cpu_stress')}
        />

        <ChaosActionCard
          title="Memory Stress"
          description="Allocate memory to simulate memory pressure"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-yellow-400">
              <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9ZM5 5.75A.75.75 0 0 1 5.75 5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 5.75Zm.75 2.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" />
            </svg>
          }
          category="resource"
          controls={[
            { type: 'slider', key: 'mb', label: 'Memory', min: 50, max: 500, step: 10, unit: 'MB', default: 100 },
            { type: 'slider', key: 'duration', label: 'Duration', min: 10, max: 120, step: 5, unit: 's', default: 30 },
          ]}
          buttonLabel="Stress Memory"
          disabled={noTarget}
          onInject={handleInject('memory_stress')}
        />

        <ChaosActionCard
          title="Fill Disk"
          description="Write random data to fill disk space"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-yellow-400">
              <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9ZM5 12V8.5h6V12H5Zm6-5H5V4h6v3Z" />
            </svg>
          }
          category="resource"
          controls={[
            { type: 'slider', key: 'mb', label: 'Size', min: 100, max: 900, step: 50, unit: 'MB', default: 200 },
          ]}
          buttonLabel="Fill Disk"
          disabled={noTarget}
          onInject={handleInject('fill_disk')}
        />

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <div className="mt-4 border-t border-[#1f1f1f] pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1a1]">
              Active Events ({activeEvents.length})
            </div>

            <div className="space-y-2">
              {activeEvents.map((event) => {
                const cat = getCategoryForAction(event.action);
                const colors = categoryColors[cat];
                const machine = session?.machines?.find(
                  (m) => m.id === event.machine_id
                );
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#141414] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors}`}
                        >
                          {event.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#525252]">
                        {machine?.hostname ?? 'unknown'} — {formatParams(event)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevert(event.id)}
                      disabled={loading}
                      className="ml-2 shrink-0 rounded border border-[#2a2a2a] px-2 py-1 text-[10px] font-medium text-[#a1a1a1] transition-colors hover:border-[#3a3a3a] hover:text-white disabled:opacity-40"
                    >
                      Revert
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRevertAll}
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-red-500/30 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
            >
              Revert All
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="border-t border-[#1f1f1f] px-4 py-2 text-center text-[11px] text-[#525252]">
          Processing...
        </div>
      )}
    </div>
  );
}
