'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (hostname: string) => Promise<void>;
}

const PRESETS = [
  { hostname: 'client', label: 'Client', description: 'API testing workstation' },
  { hostname: '', label: 'Server', description: 'Custom server -- you name it' },
];

export default function AddMachineDialog({ open, onClose, onAdd }: Props) {
  const [hostname, setHostname] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleAdd = async () => {
    const name = selectedPreset === 'client' ? 'client' : hostname.trim();
    if (!name) {
      setError('Hostname is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(name);
      setHostname('');
      setSelectedPreset(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add machine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Add Machine</h2>

        {/* Presets */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setSelectedPreset(preset.hostname || null);
                if (preset.hostname) setHostname(preset.hostname);
              }}
              className={`rounded-lg border p-3 text-left transition-all ${
                (preset.hostname && selectedPreset === preset.hostname) ||
                (!preset.hostname && selectedPreset === null)
                  ? 'border-[#22c55e] bg-[#22c55e]/5'
                  : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-[#525252]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8H3V4h18v4zM21 14H3v-4h18v4zM21 20H3v-4h18v4z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-white">{preset.label}</div>
                  <div className="text-[10px] text-[#525252]">{preset.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom hostname input */}
        {selectedPreset !== 'client' && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-[#525252]">Hostname</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="app-server-04"
              className="w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-[#fafafa] placeholder-[#525252] outline-none transition-colors focus:border-[#22c55e]"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
        )}

        {selectedPreset === 'client' && (
          <div className="mb-4 rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/5 px-3 py-2 text-xs text-[#a1a1a1]">
            Client machine comes with API Tester pre-installed. Use it to send requests to your services and run load tests.
          </div>
        )}

        {error && <p className="mb-4 text-sm text-[#ef4444]">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-[#a1a1a1] transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Machine'}
          </button>
        </div>
      </div>
    </div>
  );
}
