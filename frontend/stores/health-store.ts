import { create } from 'zustand';
import { apiGet } from '@/lib/api';
import type { MachineStatus, MachineHealth } from '@/lib/types';

interface HealthState {
  statuses: MachineStatus[];
  polling: boolean;

  fetchStatus: (sessionId: string) => Promise<void>;
  setPolling: (polling: boolean) => void;
  getHealth: (machineId: string) => MachineHealth;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  statuses: [],
  polling: false,

  fetchStatus: async (sessionId: string) => {
    try {
      const data = await apiGet<MachineStatus[]>(
        `/api/sessions/${sessionId}/status`
      );
      set({ statuses: data || [] });
    } catch {
      // health polling is best-effort
    }
  },

  setPolling: (polling: boolean) => {
    set({ polling });
  },

  getHealth: (machineId: string): MachineHealth => {
    const status = get().statuses.find((s) => s.machine_id === machineId);
    if (!status) return 'unknown';
    if (!status.container_running) return 'down';
    return 'healthy';
  },
}));
