'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Terminal as XTermTerminal } from '@xterm/xterm';
import type { FitAddon as FitAddonType } from '@xterm/addon-fit';

interface UseTerminalOptions {
  sessionId: string;
  machineId: string;
  enabled: boolean;
}

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  connected: boolean;
  error: string | null;
  disconnect: () => void;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function useTerminal({ sessionId, machineId, enabled }: UseTerminalOptions): UseTerminalReturn {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddonType | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.dispose();
      terminalInstanceRef.current = null;
    }
    fitAddonRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !terminalRef.current) return;

    let disposed = false;

    async function init() {
      // Dynamic imports to avoid SSR issues
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      // Import xterm CSS
      await import('@xterm/xterm/css/xterm.css');

      if (disposed || !terminalRef.current) return;

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        theme: {
          background: '#0a0a0a',
          foreground: '#e5e5e5',
          cursor: '#e5e5e5',
          selectionBackground: '#374151',
          black: '#0a0a0a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e5e5e5',
        },
        scrollback: 5000,
      });

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.open(terminalRef.current);
      fitAddon.fit();

      terminalInstanceRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Connect WebSocket
      const wsUrl = `${WS_BASE}/api/sessions/${sessionId}/machines/${machineId}/terminal`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setConnected(true);
        setError(null);
        // Send initial size
        ws.send(JSON.stringify({
          type: 'resize',
          rows: terminal.rows,
          cols: terminal.cols,
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        if (disposed) return;
        const raw = typeof event.data === 'string' ? event.data : '';
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'output' && typeof msg.data === 'string') {
            terminal.write(msg.data);
          }
        } catch {
          // If not JSON, write raw data (fallback)
          terminal.write(raw);
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setError('WebSocket connection error');
        setConnected(false);
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
      };

      // Terminal input -> WebSocket
      terminal.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // Terminal resize -> WebSocket
      terminal.onResize(({ rows, cols }: { rows: number; cols: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', rows, cols }));
        }
      });

      // Watch for container resize
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch {
            // fit can throw if terminal is disposed
          }
        }
      });
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      // Return cleanup for the resize observer
      return () => {
        resizeObserver.disconnect();
      };
    }

    let resizeCleanup: (() => void) | undefined;
    init().then((cleanup) => {
      resizeCleanup = cleanup;
    });

    return () => {
      disposed = true;
      resizeCleanup?.();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      fitAddonRef.current = null;
      setConnected(false);
    };
  }, [enabled, sessionId, machineId]);

  return { terminalRef, connected, error, disconnect };
}
