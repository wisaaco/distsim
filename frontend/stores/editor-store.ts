import { create } from 'zustand';

interface EditorState {
  activeMachine: { id: string; hostname: string } | null;
  openFile: string | null;
  files: Record<string, string>;
  output: string;

  openEditor: (machineId: string, hostname: string) => void;
  closeEditor: () => void;
  setOpenFile: (path: string) => void;
  setCachedFile: (path: string, content: string) => void;
  getCachedFile: (path: string) => string | undefined;
  setOutput: (output: string) => void;
  appendOutput: (line: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeMachine: null,
  openFile: null,
  files: {},
  output: '',

  openEditor: (machineId: string, hostname: string) => {
    set({
      activeMachine: { id: machineId, hostname },
      openFile: null,
      files: {},
      output: '',
    });
  },

  closeEditor: () => {
    set({
      activeMachine: null,
      openFile: null,
      files: {},
      output: '',
    });
  },

  setOpenFile: (path: string) => {
    set({ openFile: path });
  },

  setCachedFile: (path: string, content: string) => {
    set((state) => ({
      files: { ...state.files, [path]: content },
    }));
  },

  getCachedFile: (path: string) => {
    return get().files[path];
  },

  setOutput: (output: string) => {
    set({ output });
  },

  appendOutput: (line: string) => {
    set((state) => ({
      output: state.output ? state.output + '\n' + line : line,
    }));
  },
}));
