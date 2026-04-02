'use client';

import { memo, useState, useCallback } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import type { Connection } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

type ConnectionEdgeData = { connection: { protocol: string; status?: string; id?: string; session_id?: string; from_service?: string; to_service?: string } | Connection };
type ConnectionEdgeType = Edge<ConnectionEdgeData, 'connectionEdge'>;

const protocolColors: Record<string, string> = {
  http: '#3b82f6',
  https: '#3b82f6',
  postgresql: '#a855f7',
  postgres: '#a855f7',
  redis: '#f97316',
  kafka: '#22c55e',
  grpc: '#06b6d4',
  tcp: '#6b7280',
};

function getProtocolColor(protocol: string): string {
  return protocolColors[protocol.toLowerCase()] ?? '#6b7280';
}

function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<ConnectionEdgeType>) {
  const conn = data?.connection;
  const protocol = conn?.protocol ?? 'TCP';
  const status = conn && 'status' in conn ? conn.status : undefined;
  const isError = status === 'error';
  const color = isError ? '#ef4444' : getProtocolColor(protocol);
  const fromService = conn && 'from_service' in conn ? conn.from_service : '';
  const toService = conn && 'to_service' in conn ? conn.to_service : '';
  const connId = conn && 'id' in conn ? conn.id : id;
  const sessionId = conn && 'session_id' in conn ? conn.session_id : '';

  const removeConnection = useSessionStore((s) => s.removeConnection);

  const [showMenu, setShowMenu] = useState(false);

  const handleLabelClick = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  const handleDelete = useCallback(() => {
    if (sessionId && connId) {
      removeConnection(sessionId, connId);
    }
    setShowMenu(false);
  }, [sessionId, connId, removeConnection]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: isError ? '4 4' : '6 3',
          animation: isError ? 'none' : 'dashdraw 0.5s linear infinite',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="relative"
        >
          {/* Connection label — clickable */}
          <button
            onClick={handleLabelClick}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              isError
                ? 'border-red-500/30 bg-red-500/20 text-red-400'
                : selected
                  ? 'border-[#22c55e]/50 bg-[#22c55e]/20 text-[#22c55e]'
                  : 'border-[#2a2a2a] bg-[#141414]/90 text-[#a1a1a1] hover:border-[#3a3a3a] hover:bg-[#1f1f1f]/90'
            }`}
          >
            {isError && <span className="mr-1">!</span>}
            {fromService && toService
              ? `${fromService} → ${toService}`
              : protocol}
          </button>

          {/* Delete icon — appears on click */}
          {showMenu && (
            <div className="absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2">
              <button
                onClick={handleDelete}
                className="rounded-full border border-[#2a2a2a] bg-[#141414] p-1.5 text-[#525252] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                title="Delete connection"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                  <path d="M5.75 1A1.75 1.75 0 004 2.75v.5H1.5a.75.75 0 000 1.5h.5l.6 7.2A1.75 1.75 0 004.35 13.5h7.3a1.75 1.75 0 001.75-1.55l.6-7.2h.5a.75.75 0 000-1.5H12v-.5A1.75 1.75 0 0010.25 1h-4.5zM5.5 2.75A.25.25 0 015.75 2.5h4.5a.25.25 0 01.25.25v.5h-5v-.5z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(ConnectionEdge);
