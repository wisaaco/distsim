import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Session, Machine, Connection, ServiceDef, TemplateDef } from '@/lib/types';

interface SessionState {
  session: Session | null;
  serviceDefs: ServiceDef[];
  templates: TemplateDef[];
  loading: boolean;
  error: string;

  fetchSession: (id: string) => Promise<void>;
  fetchServiceDefs: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  addMachine: (sessionId: string, hostname: string) => Promise<void>;
  removeMachine: (sessionId: string, machineId: string) => Promise<void>;
  addService: (sessionId: string, machineId: string, serviceType: string) => Promise<void>;
  removeService: (sessionId: string, machineId: string, serviceId: string) => Promise<void>;
  installService: (sessionId: string, machineId: string, serviceId: string) => Promise<void>;
  createConnection: (sessionId: string, conn: {
    from_node: string;
    from_service: string;
    to_node: string;
    to_service: string;
    protocol: string;
  }) => Promise<void>;
  removeConnection: (sessionId: string, connectionId: string) => Promise<void>;
  updateMachinePosition: (sessionId: string, machineId: string, x: number, y: number) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  serviceDefs: [],
  templates: [],
  loading: false,
  error: '',

  fetchSession: async (id: string) => {
    set({ loading: true, error: '' });
    try {
      const data = await apiGet<Session>(`/api/sessions/${id}`);
      set({ session: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load session',
        loading: false,
      });
    }
  },

  fetchServiceDefs: async () => {
    try {
      const data = await apiGet<ServiceDef[]>('/api/services');
      set({ serviceDefs: data || [] });
    } catch {
      // service defs are optional; silently fail
    }
  },

  fetchTemplates: async () => {
    try {
      const data = await apiGet<TemplateDef[]>('/api/templates');
      set({ templates: data || [] });
    } catch {
      // templates are optional; silently fail
    }
  },

  addMachine: async (sessionId: string, hostname: string) => {
    await apiPost(`/api/sessions/${sessionId}/machines`, { hostname });
    await get().fetchSession(sessionId);
  },

  removeMachine: async (sessionId: string, machineId: string) => {
    await apiDelete(`/api/sessions/${sessionId}/machines/${machineId}`);
    await get().fetchSession(sessionId);
  },

  addService: async (sessionId: string, machineId: string, serviceType: string) => {
    await apiPost(`/api/sessions/${sessionId}/machines/${machineId}/services`, {
      type: serviceType,
    });
    await get().fetchSession(sessionId);
  },

  removeService: async (sessionId: string, machineId: string, serviceId: string) => {
    await apiDelete(`/api/sessions/${sessionId}/machines/${machineId}/services/${serviceId}`);
    await get().fetchSession(sessionId);
  },

  installService: async (sessionId: string, machineId: string, serviceId: string) => {
    // Optimistic: show "installing" immediately
    const session = get().session;
    if (session) {
      set({
        session: {
          ...session,
          machines: session.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  services: m.services.map((s) =>
                    s.id === serviceId ? { ...s, status: 'installing' as const } : s
                  ),
                }
              : m
          ),
        },
      });
    }

    try {
      await apiPost(`/api/sessions/${sessionId}/machines/${machineId}/services/${serviceId}/install`, {});
    } catch {
      // Revert on failure
    }
    await get().fetchSession(sessionId);
  },

  createConnection: async (sessionId: string, conn) => {
    await apiPost(`/api/sessions/${sessionId}/connections`, conn);
    await get().fetchSession(sessionId);
  },

  removeConnection: async (sessionId: string, connectionId: string) => {
    await apiDelete(`/api/sessions/${sessionId}/connections/${connectionId}`);
    await get().fetchSession(sessionId);
  },

  updateMachinePosition: async (sessionId: string, machineId: string, x: number, y: number) => {
    // Fire-and-forget to backend. Don't update local session state —
    // React Flow tracks positions internally, and updating the session
    // object would trigger unnecessary re-renders across the app.
    try {
      await apiPut(`/api/sessions/${sessionId}/machines/${machineId}/position`, {
        position_x: x,
        position_y: y,
      });
    } catch {
      // position update is best-effort
    }
  },
}));
