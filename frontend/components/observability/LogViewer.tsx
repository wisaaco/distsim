'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

interface LogLine {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  text: string;
}

interface LogViewerProps {
  sessionId: string;
  machineId: string;
  hostname: string;
}

export default function LogViewer({
  sessionId,
  machineId,
  hostname,
}: LogViewerProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Connect to WebSocket
  useEffect(() => {
    const url = `${WS_BASE}/api/sessions/${sessionId}/machines/${machineId}/logs`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          stream?: string;
          text?: string;
          timestamp?: string;
        };
        const line: LogLine = {
          timestamp:
            data.timestamp ?? new Date().toISOString().split('T')[1].slice(0, 12),
          stream: data.stream === 'stderr' ? 'stderr' : 'stdout',
          text: data.text ?? event.data,
        };
        setLines((prev) => [...prev.slice(-2000), line]);
      } catch {
        // Plain text message
        setLines((prev) => [
          ...prev.slice(-2000),
          {
            timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
            stream: 'stdout',
            text: event.data,
          },
        ]);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, machineId]);

  // Auto-scroll
  useEffect(() => {
    if (paused || !autoScrollRef.current) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines, paused]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScrollRef.current = atBottom;
  }, []);

  const handleClear = useCallback(() => {
    setLines([]);
  }, []);

  const handleTogglePause = useCallback(() => {
    setPaused((p) => !p);
    if (paused) {
      autoScrollRef.current = true;
    }
  }, [paused]);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <span className="text-xs font-medium text-gray-300">
            Logs: {hostname}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTogglePause}
            className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              paused
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                : 'border-[#2a2a2a] text-[#525252] hover:border-[#2a2a2a] hover:text-[#fafafa]'
            }`}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleClear}
            className="rounded border border-[#2a2a2a] px-2 py-0.5 text-[10px] font-medium text-[#525252] transition-colors hover:border-[#2a2a2a] hover:text-[#fafafa]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-600">
            {connected
              ? 'Waiting for log output...'
              : 'Connecting to log stream...'}
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`flex gap-2 ${
                paused && i === lines.length - 1 ? '' : ''
              }`}
            >
              <span className="shrink-0 select-none text-gray-600">
                {line.timestamp}
              </span>
              <span
                className={
                  line.stream === 'stderr' ? 'text-red-400' : 'text-[#fafafa]'
                }
              >
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
