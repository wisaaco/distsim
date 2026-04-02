'use client';

import { useState, useCallback } from 'react';

interface FileTreeProps {
  files: string[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
  onNewFile: (path: string) => void;
}

const fileIcons: Record<string, { icon: string; color: string }> = {
  '.go': { icon: 'Go', color: 'text-cyan-400' },
  '.js': { icon: 'Js', color: 'text-yellow-400' },
  '.ts': { icon: 'Ts', color: 'text-cyan-400' },
  '.py': { icon: 'Py', color: 'text-green-400' },
  '.json': { icon: '{}', color: 'text-orange-400' },
  '.yaml': { icon: 'Y', color: 'text-pink-400' },
  '.yml': { icon: 'Y', color: 'text-pink-400' },
  '.conf': { icon: 'C', color: 'text-gray-400' },
  '.toml': { icon: 'T', color: 'text-gray-400' },
  '.md': { icon: 'M', color: 'text-gray-400' },
  '.sh': { icon: '$', color: 'text-green-300' },
  '.dockerfile': { icon: 'D', color: 'text-cyan-300' },
};

function getFileIcon(filename: string): { icon: string; color: string } {
  const lower = filename.toLowerCase();
  for (const [ext, info] of Object.entries(fileIcons)) {
    if (lower.endsWith(ext)) return info;
  }
  return { icon: 'F', color: 'text-gray-500' };
}

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export default function FileTree({ files, activeFile, onFileSelect, onNewFile }: FileTreeProps) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleNewFile = useCallback(() => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setShowNewInput(false);
      return;
    }
    const fullPath = trimmed.startsWith('/')
      ? trimmed
      : `/home/distsim/app/${trimmed}`;
    onNewFile(fullPath);
    setNewFileName('');
    setShowNewInput(false);
  }, [newFileName, onNewFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNewFile();
      } else if (e.key === 'Escape') {
        setShowNewInput(false);
        setNewFileName('');
      }
    },
    [handleNewFile]
  );

  return (
    <div className="flex h-full flex-col border-r border-[#1f1f1f] bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#525252]">
          Files
        </span>
        <button
          onClick={() => setShowNewInput(true)}
          className="rounded p-0.5 text-[#525252] transition-colors hover:bg-[#141414] hover:text-[#a1a1a1]"
          title="New File"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
        </button>
      </div>

      {/* New file input */}
      {showNewInput && (
        <div className="border-b border-[#1f1f1f] px-2 py-1.5">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleNewFile}
            placeholder="filename.go"
            className="w-full rounded border border-[#2a2a2a] bg-[#141414] px-2 py-1 text-xs text-[#fafafa] placeholder-[#525252] outline-none focus:border-[#22c55e]"
            autoFocus
          />
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-[#525252]">
            No files yet
          </div>
        )}
        {files.map((filePath) => {
          const fileName = getFileName(filePath);
          const { icon, color } = getFileIcon(fileName);
          const isActive = filePath === activeFile;

          return (
            <button
              key={filePath}
              onClick={() => onFileSelect(filePath)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs transition-colors ${
                isActive
                  ? 'bg-[#141414] text-white'
                  : 'text-[#525252] hover:bg-[#141414] hover:text-[#a1a1a1]'
              }`}
              title={filePath}
            >
              <span className={`shrink-0 w-4 text-center font-mono text-[10px] font-bold ${color}`}>
                {icon}
              </span>
              <span className="truncate">{fileName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
