import { create } from 'zustand';

export interface TerminalTab {
  machineId: string;
  hostname: string;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTab: string | null;
  panelOpen: boolean;

  openTerminal: (machineId: string, hostname: string) => void;
  closeTerminal: (machineId: string) => void;
  setActiveTab: (machineId: string) => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTab: null,
  panelOpen: false,

  openTerminal: (machineId: string, hostname: string) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.machineId === machineId);
    if (existing) {
      set({ activeTab: machineId, panelOpen: true });
      return;
    }
    set({
      tabs: [...tabs, { machineId, hostname }],
      activeTab: machineId,
      panelOpen: true,
    });
  },

  closeTerminal: (machineId: string) => {
    const { tabs, activeTab } = get();
    const newTabs = tabs.filter((t) => t.machineId !== machineId);
    let newActive = activeTab;

    if (activeTab === machineId) {
      const closedIndex = tabs.findIndex((t) => t.machineId === machineId);
      if (newTabs.length > 0) {
        const nextIndex = Math.min(closedIndex, newTabs.length - 1);
        newActive = newTabs[nextIndex].machineId;
      } else {
        newActive = null;
      }
    }

    set({
      tabs: newTabs,
      activeTab: newActive,
      panelOpen: newTabs.length > 0,
    });
  },

  setActiveTab: (machineId: string) => {
    set({ activeTab: machineId });
  },

  togglePanel: () => {
    set((s) => ({ panelOpen: !s.panelOpen }));
  },

  setPanel: (open: boolean) => {
    set({ panelOpen: open });
  },
}));
