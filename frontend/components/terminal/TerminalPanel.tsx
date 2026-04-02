'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useTerminalStore } from '@/stores/terminal-store';
import Terminal from './Terminal';

interface TerminalPanelProps {
  sessionId: string;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT_RATIO = 0.7;
const DEFAULT_HEIGHT_RATIO = 0.4;

export default function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTab = useTerminalStore((s) => s.activeTab);
  const panelOpen = useTerminalStore((s) => s.panelOpen);
  const closeTerminal = useTerminalStore((s) => s.closeTerminal);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);
  const togglePanel = useTerminalStore((s) => s.togglePanel);

  const [panelHeight, setPanelHeight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Set initial height on mount based on viewport
  useEffect(() => {
    setPanelHeight(Math.round(window.innerHeight * DEFAULT_HEIGHT_RATIO));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = panelRef.current?.offsetHeight ?? panelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - moveEvent.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, startHeight.current + delta));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="flex flex-col border-t border-[#1f1f1f] bg-[#0a0a0a]"
      style={{ height: panelOpen ? panelHeight : 36 }}
    >
      {/* Drag handle */}
      {panelOpen && (
        <div
          className="flex h-1.5 cursor-row-resize items-center justify-center hover:bg-[#141414]"
          onMouseDown={handleMouseDown}
        >
          <div className="h-0.5 w-8 rounded-full bg-[#2a2a2a]" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center border-b border-[#1f1f1f] bg-[#0a0a0a]">
        <button
          onClick={togglePanel}
          className="flex h-8 w-8 items-center justify-center text-xs text-[#525252] hover:text-[#a1a1a1]"
          title={panelOpen ? 'Collapse terminal' : 'Expand terminal'}
        >
          {panelOpen ? '\u25BC' : '\u25B2'}
        </button>

        <div className="flex flex-1 items-center gap-px overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.machineId}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                activeTab === tab.machineId
                  ? 'bg-[#141414] text-white'
                  : 'text-[#525252] hover:bg-[#141414]/50 hover:text-[#a1a1a1]'
              }`}
              onClick={() => setActiveTab(tab.machineId)}
            >
              <span className="font-mono">{tab.hostname}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(tab.machineId);
                }}
                className="ml-1 rounded p-0.5 text-[#525252] opacity-0 transition-opacity hover:bg-[#2a2a2a] hover:text-[#a1a1a1] group-hover:opacity-100"
                title="Close terminal"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal content area */}
      {panelOpen && (
        <div className="flex-1 overflow-hidden">
          {tabs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#525252]">
              Click a machine to open terminal
            </div>
          ) : (
            tabs.map((tab) => (
              <Terminal
                key={tab.machineId}
                sessionId={sessionId}
                machineId={tab.machineId}
                hostname={tab.hostname}
                active={activeTab === tab.machineId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
