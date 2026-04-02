'use client';

import { useTerminal } from '@/hooks/useTerminal';

interface TerminalProps {
  sessionId: string;
  machineId: string;
  hostname: string;
  active: boolean;
}

export default function Terminal({ sessionId, machineId, hostname, active }: TerminalProps) {
  const { terminalRef, connected, error } = useTerminal({
    sessionId,
    machineId,
    enabled: active,
  });

  return (
    <div className={`flex h-full flex-col bg-[#0a0a0a] ${active ? '' : 'hidden'}`}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-3 py-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-400'
          }`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
        <span className="font-mono text-xs text-gray-400">{hostname}</span>
        {error && (
          <span className="ml-2 text-xs text-red-400">{error}</span>
        )}
      </div>

      {/* Terminal content */}
      <div ref={terminalRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
