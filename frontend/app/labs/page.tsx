'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import type { Session, CreateSessionRequest } from '@/lib/types';
import CreateSessionDialog from '@/components/CreateSessionDialog';

/* ---------- SVG Icons ---------- */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8H3V4h18v4zM21 14H3v-4h18v4zM21 20H3v-4h18v4zM7 6h.01M7 12h.01M7 18h.01" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function LabsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-[#525252]">Loading labs...</div>
        </div>
      </div>
    }>
      <LabsContent />
    </Suspense>
  );
}

function LabsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Open create dialog if ?create=true is in URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreate(true);
    }
  }, [searchParams]);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiGet<Session[]>('/api/sessions');
      setSessions(data || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (req: CreateSessionRequest) => {
    await apiPost('/api/sessions', req);
    await fetchSessions();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this session? All machines will be destroyed.')) return;
    try {
      await apiDelete(`/api/sessions/${id}`);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const handleDialogClose = () => {
    setShowCreate(false);
    // Clean up URL param if present
    if (searchParams.get('create')) {
      router.replace('/labs');
    }
  };

  const formatTime = (iso: string) => {
    try {
      const now = new Date();
      const date = new Date(iso);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const statusDotColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-[#22c55e]';
      case 'creating': return 'bg-[#eab308]';
      default: return 'bg-[#ef4444]';
    }
  };

  const templateLabel = (template: string) => {
    return template.charAt(0).toUpperCase() + template.slice(1);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Labs</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Create and manage distributed system environments
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-3.5 py-2 text-sm font-medium text-black transition-colors hover:bg-[#16a34a]"
        >
          <PlusIcon className="h-4 w-4" />
          New Lab
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-[#525252]">Loading labs...</div>
        </div>
      ) : sessions.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1f1f] py-24">
          <div className="mb-4 text-[#525252]">
            <ServerIcon className="h-10 w-10" />
          </div>
          <p className="mb-1 text-sm font-medium text-[#a1a1a1]">No labs yet</p>
          <p className="mb-6 max-w-xs text-center text-sm text-[#525252]">
            Create your first distributed system lab to start building and learning.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#16a34a]"
          >
            <PlusIcon className="h-4 w-4" />
            Create Your First Lab
          </button>
        </div>
      ) : (
        /* Lab cards grid */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => router.push(`/session/${session.id}`)}
              className="group cursor-pointer rounded-xl border border-[#1f1f1f] bg-[#141414] p-5 transition-colors hover:border-[#2a2a2a]"
            >
              {/* Header row */}
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-[#22c55e]">
                  {session.name}
                </h3>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${statusDotColor(session.status)}`} />
                  <span className="text-xs text-[#525252]">{session.status}</span>
                </span>
              </div>

              {/* Template badge */}
              <div className="mb-3">
                <span className="inline-flex rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-0.5 font-mono text-[10px] text-[#525252]">
                  {templateLabel(session.template)}
                </span>
              </div>

              {/* Stats */}
              <div className="mb-4 flex items-center gap-4 text-xs text-[#525252]">
                <span>{session.machines ? session.machines.length : 0} machines</span>
                <span>{formatTime(session.created_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-3">
                <span className="text-xs text-[#525252] opacity-0 transition-opacity group-hover:opacity-100">
                  Open
                </span>
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className="rounded p-1 text-[#525252] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSessionDialog
        open={showCreate}
        onClose={handleDialogClose}
        onCreate={handleCreate}
      />
    </div>
  );
}
