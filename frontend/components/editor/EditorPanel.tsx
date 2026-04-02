'use client';

import CodeEditor from './CodeEditor';

interface EditorPanelProps {
  sessionId: string;
  machineId: string;
  hostname: string;
  onClose: () => void;
}

export default function EditorPanel({
  sessionId,
  machineId,
  hostname,
  onClose,
}: EditorPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#141414] px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded p-1 text-[#525252] transition-colors hover:bg-[#0a0a0a] hover:text-[#a1a1a1]"
            title="Close editor"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-[#a1a1a1]">
              <path d="M4.708 5.578L2.061 8.224l2.647 2.646-.708.708L.94 8.518a.5.5 0 010-.707L4 4.87l.708.708zm6.584 0L13.939 8.224l-2.647 2.646.708.708 3.06-3.06a.5.5 0 000-.707L12 4.87l-.708.708zM6.908 12.889l2.186-9.789.98.218-2.186 9.789-.98-.218z" />
            </svg>
            <span className="text-sm font-semibold text-white">{hostname}</span>
            <span className="text-xs text-[#525252]">Code Editor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#525252]">
            Press Ctrl+S to save
          </span>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          sessionId={sessionId}
          machineId={machineId}
          hostname={hostname}
        />
      </div>
    </div>
  );
}
