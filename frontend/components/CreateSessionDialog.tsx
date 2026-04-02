'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreateSessionRequest, TemplateDef } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (req: CreateSessionRequest) => Promise<void>;
}

const TEMPLATE_ICONS: Record<string, string> = {
  small: '3',
  medium: '10',
  large: '16',
  custom: '+',
};

export default function CreateSessionDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('small');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const templates = useSessionStore((s) => s.templates);
  const fetchTemplates = useSessionStore((s) => s.fetchTemplates);

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open, fetchTemplates]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), template: selectedTemplate });
      setName('');
      setSelectedTemplate('small');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }, [name, selectedTemplate, onCreate, onClose]);

  if (!open) return null;

  // Use API templates, sorted by size. Only add custom if not already present.
  const order: Record<string, number> = { small: 0, medium: 1, large: 2, custom: 3 };
  const hasCustom = templates.some((t) => t.id === 'custom');
  const combined = hasCustom
    ? templates
    : [...templates, { id: 'custom', name: 'Custom', description: 'Blank canvas -- build from scratch', machines: [], connections: [] } as typeof templates[0]];
  const allTemplates = [...combined].sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Create New Lab</h2>

        {/* Name input */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-[#525252]">Lab Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-distributed-lab"
            className="w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] placeholder-[#525252] outline-none transition-colors focus:border-[#22c55e]"
            autoFocus
          />
        </div>

        {/* Template selection */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-medium text-[#525252]">Infrastructure Size</label>
          <div className="grid grid-cols-2 gap-3">
            {allTemplates.map((t) => {
              const isSelected = selectedTemplate === t.id;
              const machineCount = t.machines.length;
              const serviceCount = t.machines.reduce((sum, m) => sum + m.services.length, 0);
              const isCustom = t.id === 'custom';

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#22c55e] bg-[#22c55e]/5'
                      : isCustom
                        ? 'border-dashed border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                        : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                  }`}
                >
                  {/* Icon circle with machine count */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-bold ${
                      isSelected
                        ? 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]'
                        : 'border-[#2a2a2a] bg-[#141414] text-[#525252]'
                    }`}>
                      {TEMPLATE_ICONS[t.id] || machineCount}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="truncate text-[11px] text-[#525252]">{t.description}</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  {!isCustom && machineCount > 0 && (
                    <div className="mt-2 flex gap-3 text-[10px] text-[#525252]">
                      <span>{machineCount} machines</span>
                      <span>{serviceCount} services</span>
                      <span>{t.connections.length} connections</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-[#ef4444]">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-[#a1a1a1] transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Lab'}
          </button>
        </div>
      </div>
    </div>
  );
}
