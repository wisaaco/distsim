'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Node, OnNodeDrag, OnConnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/stores/canvas-store';
import { useSessionStore } from '@/stores/session-store';
import { canConnect, canMachinesConnect } from '@/lib/constants';
import type { Machine, Connection as AppConnection } from '@/lib/types';
import MachineNode from './MachineNode';
import ConnectionEdge from './ConnectionEdge';

type MachineNodeData = { machine: Machine };

function machinesToNodes(machines: Machine[]): Node<MachineNodeData>[] {
  return machines.map((machine) => ({
    id: machine.id,
    type: 'machineNode',
    position: { x: machine.position_x ?? 0, y: machine.position_y ?? 0 },
    data: { machine },
  }));
}

function connectionsToEdges(connections: AppConnection[], machines: Machine[]) {
  const posMap = new Map(machines.map((m) => [m.id, { x: m.position_x ?? 0, y: m.position_y ?? 0 }]));

  return connections.map((conn) => {
    const fromPos = posMap.get(conn.from_node);
    const toPos = posMap.get(conn.to_node);

    // Always flow left-to-right: the node with smaller X is the source (right handle),
    // the node with larger X is the target (left handle).
    // If same X, use top-to-bottom.
    let source = conn.from_node;
    let target = conn.to_node;

    if (fromPos && toPos) {
      const shouldSwap = fromPos.x > toPos.x || (fromPos.x === toPos.x && fromPos.y > toPos.y);
      if (shouldSwap) {
        source = conn.to_node;
        target = conn.from_node;
      }
    }

    return {
      id: conn.id,
      source,
      target,
      type: 'connectionEdge',
      data: { connection: conn },
    };
  });
}

interface CanvasInnerProps {
  sessionId: string;
}

function CanvasInner({ sessionId }: CanvasInnerProps) {
  const session = useSessionStore((s) => s.session);
  const updateMachinePosition = useSessionStore((s) => s.updateMachinePosition);
  const addService = useSessionStore((s) => s.addService);
  const createConnection = useSessionStore((s) => s.createConnection);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);

  const nodeTypes = useMemo(() => ({ machineNode: MachineNode }), []);
  const edgeTypes = useMemo(() => ({ connectionEdge: ConnectionEdge }), []);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevFingerprintRef = useRef('');
  const initialFitDone = useRef(false);
  const { fitView } = useReactFlow();

  const currentFingerprint = session
    ? [
        (session.machines ?? []).map(m =>
          `${m.id}:${(m.services ?? []).map(s => `${s.id}|${s.status}|${s.installed}`).join(',')}`
        ).join(';'),
        (session.connections ?? []).map(c => c.id).join(';'),
      ].join('||')
    : '';

  // Sync canvas when fingerprint changes — update nodes in-place to avoid reset.
  useEffect(() => {
    if (!session || currentFingerprint === prevFingerprintRef.current) return;
    const isInitial = prevFingerprintRef.current === '';
    prevFingerprintRef.current = currentFingerprint;

    const currentNodes = useCanvasStore.getState().nodes;
    const currentPositions = new Map(
      currentNodes.map((n) => [n.id, n.position])
    );

    const newNodes = (session.machines ?? []).map((machine) => {
      const existing = currentPositions.get(machine.id);
      const position = existing ?? {
        x: machine.position_x ?? 0,
        y: machine.position_y ?? 0,
      };
      return {
        id: machine.id,
        type: 'machineNode' as const,
        position,
        data: { machine },
      };
    });

    const newEdges = connectionsToEdges(session.connections ?? [], session.machines ?? []);
    setNodes(newNodes);
    setEdges(newEdges);

    // fitView only on initial load
    if (isInitial && !initialFitDone.current) {
      initialFitDone.current = true;
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFingerprint, setNodes, setEdges]);

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      // Debounce position save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        updateMachinePosition(sessionId, node.id, node.position.x, node.position.y);
      }, 300);
    },
    [sessionId, updateMachinePosition]
  );

  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-clear connection error after 3 seconds
  useEffect(() => {
    if (!connectionError) return;
    const timer = setTimeout(() => setConnectionError(null), 3000);
    return () => clearTimeout(timer);
  }, [connectionError]);

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const sourceMachine = session?.machines?.find((m) => m.id === connection.source);
      const targetMachine = session?.machines?.find((m) => m.id === connection.target);

      if (!sourceMachine || !targetMachine) return;

      const sourceServices = sourceMachine.services ?? [];
      const targetServices = targetMachine.services ?? [];

      if (sourceServices.length === 0 || targetServices.length === 0) {
        setConnectionError('Both machines need at least one service to connect');
        return;
      }

      // Validate using client-side type system
      const sourceTypes = sourceServices.map((s) => s.type);
      const targetTypes = targetServices.map((s) => s.type);
      const result = canMachinesConnect(sourceTypes, targetTypes);
      if (!result.valid) {
        setConnectionError(result.error ?? 'Invalid connection');
        return;
      }

      // Auto-detect the best service pair and protocol.
      // Try every combination and pick the first valid one.
      const protocolMap: Record<string, string> = {
        postgresql: 'postgresql',
        redis: 'redis',
        kafka: 'kafka',
      };

      let fromService = '';
      let toService = '';
      let protocol = 'http';
      let found = false;

      for (const src of sourceServices) {
        for (const tgt of targetServices) {
          const check = canConnect(src.type, tgt.type);
          if (check.valid) {
            fromService = src.type;
            toService = tgt.type;
            protocol = protocolMap[tgt.type] ?? 'http';
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        setConnectionError('No compatible service pair found between these machines');
        return;
      }

      createConnection(sessionId, {
        from_node: connection.source,
        from_service: fromService,
        to_node: connection.target,
        to_service: toService,
        protocol,
      });
    },
    [sessionId, session, createConnection]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const serviceType = event.dataTransfer.getData('application/distsim-service');
      if (!serviceType) return;

      // Find which node the service was dropped on
      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      if (!targetElement) return;

      // Walk up to find the react-flow node wrapper
      const nodeEl = targetElement.closest('[data-id]');
      if (!nodeEl) return;

      const machineId = nodeEl.getAttribute('data-id');
      if (!machineId) return;

      addService(sessionId, machineId, serviceType);
    },
    [sessionId, addService]
  );

  return (
    <div
      className="relative h-full w-full bg-[#0a0a0a]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#0a0a0a]"
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls
          className="!rounded-lg !border-[#2a2a2a] !bg-[#141414] [&>button]:!border-[#2a2a2a] [&>button]:!bg-[#141414] [&>button]:!text-[#525252] [&>button:hover]:!bg-[#141414]"
        />
        <MiniMap
          className="!rounded-lg !border-[#2a2a2a] !bg-[#141414]"
          nodeColor="#374151"
          maskColor="rgba(0, 0, 0, 0.5)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Connection validation error toast */}
      {connectionError && (
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 animate-pulse rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 shadow-lg backdrop-blur-sm">
          {connectionError}
        </div>
      )}
    </div>
  );
}

interface CanvasProps {
  sessionId: string;
}

export default function Canvas({ sessionId }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner sessionId={sessionId} />
    </ReactFlowProvider>
  );
}
