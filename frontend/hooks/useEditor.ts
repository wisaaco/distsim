'use client';

import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { ExecResult, WriteFileRequest } from '@/lib/types';

interface UseEditorOptions {
  sessionId: string;
  machineId: string;
}

interface UseEditorReturn {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  execCommand: (command: string) => Promise<{ output: string; exit_code: number }>;
  saving: boolean;
  executing: boolean;
}

export function useEditor({ sessionId, machineId }: UseEditorOptions): UseEditorReturn {
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  const readFile = useCallback(
    async (path: string): Promise<string> => {
      const encodedPath = encodeURIComponent(path);
      const result = await apiGet<{ content: string }>(
        `/api/sessions/${sessionId}/machines/${machineId}/files?path=${encodedPath}`
      );
      return result.content;
    },
    [sessionId, machineId]
  );

  const writeFile = useCallback(
    async (path: string, content: string): Promise<void> => {
      setSaving(true);
      try {
        const body: WriteFileRequest = { path, content };
        await apiPut(`/api/sessions/${sessionId}/machines/${machineId}/files`, body);
      } finally {
        setSaving(false);
      }
    },
    [sessionId, machineId]
  );

  const execCommand = useCallback(
    async (command: string): Promise<{ output: string; exit_code: number }> => {
      setExecuting(true);
      try {
        const result = await apiPost<ExecResult>(
          `/api/sessions/${sessionId}/machines/${machineId}/exec`,
          { command }
        );
        return result;
      } finally {
        setExecuting(false);
      }
    },
    [sessionId, machineId]
  );

  return { readFile, writeFile, execCommand, saving, executing };
}
