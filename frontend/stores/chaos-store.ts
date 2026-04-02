import { create } from 'zustand';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import type { ChaosEvent } from '@/lib/types';

interface ChaosTarget {
  id: string;
  hostname: string;
  ip: string;
}

interface ChaosState {
  events: ChaosEvent[];
  panelOpen: boolean;
  selectedMachine: ChaosTarget | null;
  loading: boolean;

  fetchEvents: (sessionId: string) => Promise<void>;
  injectChaos: (
    sessionId: string,
    machineId: string,
    action: string,
    params: Record<string, string>
  ) => Promise<void>;
  revertChaos: (sessionId: string, eventId: string) => Promise<void>;
  revertAll: (sessionId: string) => Promise<void>;
  selectMachine: (machine: ChaosTarget | null) => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  getEventsForMachine: (machineId: string) => ChaosEvent[];
}

export const useChaosStore = create<ChaosState>((set, get) => ({
  events: [],
  panelOpen: false,
  selectedMachine: null,
  loading: false,

  fetchEvents: async (sessionId: string) => {
    try {
      const data = await apiGet<ChaosEvent[]>(
        `/api/sessions/${sessionId}/chaos`
      );
      set({ events: data || [] });
    } catch {
      // chaos events are best-effort
    }
  },

  injectChaos: async (
    sessionId: string,
    machineId: string,
    action: string,
    params: Record<string, string>
  ) => {
    set({ loading: true });
    try {
      await apiPost(`/api/sessions/${sessionId}/chaos`, {
        machine_id: machineId,
        action,
        params,
      });
      await get().fetchEvents(sessionId);
    } finally {
      set({ loading: false });
    }
  },

  revertChaos: async (sessionId: string, eventId: string) => {
    set({ loading: true });
    try {
      await apiDelete(`/api/sessions/${sessionId}/chaos/${eventId}`);
      await get().fetchEvents(sessionId);
    } finally {
      set({ loading: false });
    }
  },

  revertAll: async (sessionId: string) => {
    set({ loading: true });
    try {
      await apiPost(`/api/sessions/${sessionId}/chaos/revert-all`, {});
      await get().fetchEvents(sessionId);
    } finally {
      set({ loading: false });
    }
  },

  selectMachine: (machine: ChaosTarget | null) => {
    set({ selectedMachine: machine });
  },

  togglePanel: () => {
    set((s) => ({ panelOpen: !s.panelOpen }));
  },

  setPanel: (open: boolean) => {
    set({ panelOpen: open });
  },

  getEventsForMachine: (machineId: string) => {
    return get().events.filter(
      (e) => e.machine_id === machineId && e.status === 'active'
    );
  },
}));
