import { create } from 'zustand';
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Connection,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes: Node[]) => set({ nodes }),
  setEdges: (edges: Edge[]) => set({ edges }),
  setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        { ...connection, type: 'connectionEdge', data: { connection: { protocol: 'HTTP' } } },
        get().edges
      ),
    });
  },
}));
