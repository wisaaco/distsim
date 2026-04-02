import { create } from 'zustand';

interface ServiceConfigTarget {
  sessionId: string;
  machineId: string;
  machineHostname: string;
  serviceId: string;
  serviceType: string;
}

interface ServiceConfigState {
  target: ServiceConfigTarget | null;
  open: (target: ServiceConfigTarget) => void;
  close: () => void;
}

export const useServiceConfigStore = create<ServiceConfigState>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
