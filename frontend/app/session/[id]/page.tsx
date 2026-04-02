'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiDelete } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { useChaosStore } from '@/stores/chaos-store';
import StatusBadge from '@/components/ui/StatusBadge';
import AddMachineDialog from '@/components/AddMachineDialog';
import Canvas from '@/components/canvas/Canvas';
import Toolbar from '@/components/canvas/Toolbar';
import TerminalPanel from '@/components/terminal/TerminalPanel';
import EditorPanel from '@/components/editor/EditorPanel';
import ServiceConfigPanel from '@/components/editor/ServiceConfigPanel';
import APITesterPanel from '@/components/editor/APITesterPanel';
import ChaosPanel from '@/components/chaos/ChaosPanel';
import HealthOverlay from '@/components/observability/HealthOverlay';
import { useEditorStore } from '@/stores/editor-store';
import { useServiceConfigStore } from '@/stores/service-config-store';

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const fetchSession = useSessionStore((s) => s.fetchSession);
  const addMachine = useSessionStore((s) => s.addMachine);
  const addService = useSessionStore((s) => s.addService);

  const activeMachine = useEditorStore((s) => s.activeMachine);
  const closeEditor = useEditorStore((s) => s.closeEditor);

  const configTarget = useServiceConfigStore((s) => s.target);

  const chaosOpen = useChaosStore((s) => s.panelOpen);
  const toggleChaos = useChaosStore((s) => s.togglePanel);

  const [showAddMachine, setShowAddMachine] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchSession(params.id);
  }, [params.id, fetchSession]);

  const handleAddMachine = useCallback(async (hostname: string) => {
    await addMachine(params.id, hostname);
  }, [params.id, addMachine]);

  const handleDeleteSession = useCallback(async () => {
    if (!confirm('Delete this session? All machines will be destroyed.')) return;
    try {
      await apiDelete(`/api/sessions/${params.id}`);
      router.push('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, [params.id, router]);

  const handleDropService = useCallback(
    (machineId: string, serviceType: string) => {
      addService(params.id, machineId, serviceType);
    },
    [params.id, addService]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-[#525252]">Loading session...</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* ─── Floating top-left: back + session info ─── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3 py-2.5">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a]/80 px-2.5 py-1.5 backdrop-blur-sm">
          <button
            onClick={() => router.push('/labs')}
            className="rounded p-0.5 text-[#525252] transition-colors hover:text-[#a1a1a1]"
            title="Back to labs"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" />
            </svg>
          </button>
          <div className="h-4 w-px bg-[#1f1f1f]" />
          <span className="text-xs font-medium text-white">{session.name}</span>
          <StatusBadge status={session.status} />
          <span className="text-[10px] text-[#525252]">
            {session.machines?.length ?? 0} machines
          </span>
          <div className="h-4 w-px bg-[#1f1f1f]" />
          <button
            onClick={handleDeleteSession}
            className="rounded p-0.5 text-[#525252] transition-colors hover:text-[#ef4444]"
            title="Delete lab"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25Zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {(error || deleteError) && (
        <div className="border-b border-[#ef4444]/30 bg-[#ef4444]/10 px-6 py-2 text-sm text-[#ef4444]">
          {error || deleteError}
        </div>
      )}

      {/* Main content: Canvas + Toolbar + ChaosPanel + Terminal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <Canvas sessionId={params.id} />
          </div>
          <Toolbar
            collapsed={toolbarCollapsed}
            onToggle={() => setToolbarCollapsed((c) => !c)}
            sessionId={params.id}
            onDropService={handleDropService}
            onAddMachine={() => setShowAddMachine(true)}
          />
          <ChaosPanel sessionId={params.id} />
        </div>
        <TerminalPanel sessionId={params.id} />
      </div>

      <HealthOverlay sessionId={params.id} />

      <AddMachineDialog
        open={showAddMachine}
        onClose={() => setShowAddMachine(false)}
        onAdd={handleAddMachine}
      />

      {activeMachine && (
        <EditorPanel
          sessionId={params.id}
          machineId={activeMachine.id}
          hostname={activeMachine.hostname}
          onClose={closeEditor}
        />
      )}

      <ServiceConfigPanel />

      {/* API Tester -- opens when api_tester service is clicked */}
      {configTarget?.serviceType === 'api_tester' && session && (() => {
        const machine = session.machines?.find((m) => m.id === configTarget.machineId);
        if (!machine) return null;
        return (
          <APITesterPanel
            sessionId={params.id}
            machine={machine}
            onClose={() => useServiceConfigStore.getState().close()}
          />
        );
      })()}
    </div>
  );
}
