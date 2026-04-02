'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useEditor } from '@/hooks/useEditor';
import { useEditorStore } from '@/stores/editor-store';
import { useSessionStore } from '@/stores/session-store';
import FileTree from './FileTree';

interface CodeEditorProps {
  sessionId: string;
  machineId: string;
  hostname: string;
}

const languageMap: Record<string, string> = {
  '.go': 'go',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.py': 'python',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.sh': 'shell',
  '.conf': 'plaintext',
  '.txt': 'plaintext',
};

const runCommands: Record<string, (path: string) => string> = {
  '.go': (path) => `cd $(dirname ${path}) && go run $(basename ${path})`,
  '.js': (path) => `node ${path}`,
  '.ts': (path) => `npx ts-node ${path}`,
  '.py': (path) => `python3 ${path}`,
  '.sh': (path) => `bash ${path}`,
};

function getLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [ext, lang] of Object.entries(languageMap)) {
    if (lower.endsWith(ext)) return lang;
  }
  return 'plaintext';
}

function getRunCommand(filename: string, path: string): string | null {
  const lower = filename.toLowerCase();
  for (const [ext, cmdFn] of Object.entries(runCommands)) {
    if (lower.endsWith(ext)) return cmdFn(path);
  }
  return null;
}

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

const defaultStarterFiles: Record<string, { path: string; content: string }[]> = {
  custom_go: [
    {
      path: '/home/distsim/app/main.go',
      content: `package main

import (
\t"fmt"
\t"net/http"
)

func main() {
\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
\t\tfmt.Fprintf(w, "Hello from Go!")
\t})
\tfmt.Println("Server starting on :8080")
\thttp.ListenAndServe(":8080", nil)
}
`,
    },
  ],
  custom_node: [
    {
      path: '/home/distsim/app/index.js',
      content: `// Node.js HTTP server — no dependencies needed (uses built-in 'http' module)
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.end('ok\\n');
    return;
  }
  res.end('Hello from Node.js service!\\n');
});

server.listen(8080, () => {
  console.log('Listening on :8080');
});

// To use Express instead, run in terminal:
//   cd /home/distsim/app && npm init -y && npm install express
// Then replace this file with:
//   const express = require('express');
//   const app = express();
//   app.get('/', (req, res) => res.send('Hello!'));
//   app.listen(8080);
`,
    },
  ],
  custom_python: [
    {
      path: '/home/distsim/app/app.py',
      content: `# Python HTTP server — no dependencies needed (uses built-in 'http.server' module)
from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        if self.path == '/health':
            self.wfile.write(b'ok\\n')
        else:
            self.wfile.write(b'Hello from Python service!\\n')

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

print('Listening on :8080')
HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()

# To use Flask instead, run in terminal:
#   pip3 install flask
# Then replace this file with:
#   from flask import Flask
#   app = Flask(__name__)
#   @app.route('/')
#   def hello(): return 'Hello!'
#   app.run(host='0.0.0.0', port=8080)
`,
    },
  ],
};

export default function CodeEditor({ sessionId, machineId, hostname }: CodeEditorProps) {
  const { readFile, writeFile, execCommand, saving, executing } = useEditor({
    sessionId,
    machineId,
  });

  const openFile = useEditorStore((s) => s.openFile);
  const setOpenFile = useEditorStore((s) => s.setOpenFile);
  const cachedFiles = useEditorStore((s) => s.files);
  const setCachedFile = useEditorStore((s) => s.setCachedFile);
  const output = useEditorStore((s) => s.output);
  const setOutput = useEditorStore((s) => s.setOutput);
  const appendOutput = useEditorStore((s) => s.appendOutput);

  const [fileList, setFileList] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine service type for starter files by checking actual services on the machine.
  const getServiceType = useCallback((): string | null => {
    const session = useSessionStore.getState().session;
    if (!session) return null;

    const machine = session.machines?.find((m) => m.id === machineId);
    if (!machine) return null;

    // Find the first custom service on this machine
    for (const svc of machine.services ?? []) {
      const t = svc.type.toLowerCase();
      if (t === 'custom_node' || t === 'nodejs') return 'custom_node';
      if (t === 'custom_go' || t === 'go') return 'custom_go';
      if (t === 'custom_python' || t === 'python') return 'custom_python';
    }
    return null;
  }, [machineId]);

  // Initialize: scan container for existing files, fall back to starters if empty.
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    async function loadFiles() {
      // List actual files in the container's app directory.
      try {
        const result = await execCommand('find /home/distsim/app -type f -maxdepth 2 2>/dev/null | head -20');
        const existingFiles = result.output
          .split('\n')
          .map((f) => f.trim())
          .filter((f) => f.length > 0 && f.startsWith('/'));

        if (existingFiles.length > 0) {
          setFileList(existingFiles);
          setOpenFile(existingFiles[0]);
          // Load first file content
          try {
            const content = await readFile(existingFiles[0]);
            setEditorContent(content);
            setCachedFile(existingFiles[0], content);
          } catch {
            setEditorContent('');
          }
          return;
        }
      } catch {
        // Container might not be ready — fall back to starters.
      }

      // No files found — use starter templates.
      const serviceType = getServiceType();
      const starters = serviceType ? defaultStarterFiles[serviceType] : null;

      if (starters && starters.length > 0) {
        const paths = starters.map((s) => s.path);
        setFileList(paths);
        for (const starter of starters) {
          setCachedFile(starter.path, starter.content);
        }
        setOpenFile(paths[0]);
        setEditorContent(starters[0].content);
      } else {
        const defaultPath = '/home/distsim/app/main.go';
        setFileList([defaultPath]);
        setCachedFile(defaultPath, '// Write your code here\n');
        setOpenFile(defaultPath);
        setEditorContent('// Write your code here\n');
      }
    }

    loadFiles();
  }, [initialized, getServiceType, setCachedFile, setOpenFile, execCommand, readFile]);

  // Load file content when openFile changes
  useEffect(() => {
    if (!openFile) return;

    const cached = cachedFiles[openFile];
    if (cached !== undefined) {
      setEditorContent(cached);
      return;
    }

    let cancelled = false;
    setLoadingFile(true);
    setFileError('');

    readFile(openFile)
      .then((content) => {
        if (cancelled) return;
        setCachedFile(openFile, content);
        setEditorContent(content);
      })
      .catch((err) => {
        if (cancelled) return;
        setFileError(err instanceof Error ? err.message : 'Failed to read file');
        setEditorContent('');
      })
      .finally(() => {
        if (!cancelled) setLoadingFile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [openFile, readFile, setCachedFile, cachedFiles]);

  const handleSave = useCallback(async () => {
    if (!openFile) return;
    try {
      setFileError('');
      await writeFile(openFile, editorContent);
      setCachedFile(openFile, editorContent);
      appendOutput(`[save] Saved ${openFile}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save file';
      setFileError(msg);
      appendOutput(`[save] Error: ${msg}`);
    }
  }, [openFile, editorContent, writeFile, setCachedFile, appendOutput]);

  // Init running state from the service's actual status in the store.
  const serviceStatus = useMemo(() => {
    const session = useSessionStore.getState().session;
    if (!session) return 'pending';
    const machine = session.machines?.find((m) => m.id === machineId);
    if (!machine) return 'pending';
    const svcType = getServiceType();
    if (!svcType) return 'pending';
    const svc = machine.services?.find((s) => s.type === svcType);
    return svc?.status ?? 'pending';
  }, [machineId, getServiceType]);

  const [running, setRunning] = useState(serviceStatus === 'running');

  // Helper to sync status to the session store.
  const syncServiceStatus = useCallback((status: 'running' | 'stopped') => {
    const session = useSessionStore.getState().session;
    if (!session) return;
    const svcType = getServiceType();
    if (!svcType) return;
    useSessionStore.setState({
      session: {
        ...session,
        machines: session.machines.map((m) =>
          m.id === machineId
            ? { ...m, services: m.services.map((s) => s.type === svcType ? { ...s, status } : s) }
            : m
        ),
      },
    });
  }, [machineId, getServiceType]);

  const handleStop = useCallback(async () => {
    if (!openFile) return;
    const fileName = getFileName(openFile);
    const ext = fileName.toLowerCase();

    let killCmd = '';
    if (ext.endsWith('.js')) killCmd = 'pkill -f "node.*distsim/app" 2>/dev/null; echo stopped';
    else if (ext.endsWith('.py')) killCmd = 'pkill -f "python.*distsim/app" 2>/dev/null; echo stopped';
    else if (ext.endsWith('.go')) killCmd = 'pkill -f "/home/distsim/app/service" 2>/dev/null; pkill -f "go run.*distsim" 2>/dev/null; echo stopped';
    else killCmd = `pkill -f "${openFile}" 2>/dev/null; echo stopped`;

    appendOutput('[stop] Stopping...');
    try {
      const result = await execCommand(killCmd);
      appendOutput(result.output || 'Process stopped');
      setRunning(false);
      syncServiceStatus('stopped');
    } catch {
      appendOutput('[stop] Failed to stop');
    }
  }, [openFile, execCommand, appendOutput]);

  const handleRun = useCallback(async () => {
    if (!openFile) return;

    // Save before running
    try {
      await writeFile(openFile, editorContent);
      setCachedFile(openFile, editorContent);
    } catch {
      // Save failed; still try to run
    }

    const fileName = getFileName(openFile);
    const cmd = getRunCommand(fileName, openFile);
    if (!cmd) {
      appendOutput(`[run] No run command for ${fileName}`);
      return;
    }

    // Run in background with nohup so it persists
    const bgCmd = `nohup ${cmd} > /tmp/distsim-run.log 2>&1 & echo "PID: $!"`;
    appendOutput(`[run] $ ${cmd}`);
    try {
      const result = await execCommand(bgCmd);
      if (result.output) {
        appendOutput(result.output);
      }
      setRunning(true);
      syncServiceStatus('running');
      // Show initial output after a brief delay
      setTimeout(async () => {
        try {
          const log = await execCommand('cat /tmp/distsim-run.log 2>/dev/null');
          if (log.output?.trim()) appendOutput(log.output);
        } catch { /* ignore */ }
      }, 1000);
      if (result.exit_code !== 0) {
        appendOutput(`[run] Process exited with code ${result.exit_code}`);
      } else {
        appendOutput('[run] Completed successfully');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      appendOutput(`[run] Error: ${msg}`);
    }
  }, [openFile, editorContent, writeFile, setCachedFile, execCommand, appendOutput]);

  const handleFileSelect = useCallback(
    (path: string) => {
      // Cache current content before switching
      if (openFile) {
        setCachedFile(openFile, editorContent);
      }
      setOpenFile(path);
    },
    [openFile, editorContent, setCachedFile, setOpenFile]
  );

  const handleNewFile = useCallback(
    (path: string) => {
      if (fileList.includes(path)) {
        setOpenFile(path);
        return;
      }
      const content = '';
      setCachedFile(path, content);
      setFileList((prev) => [...prev, path]);
      setOpenFile(path);
      setEditorContent(content);
    },
    [fileList, setCachedFile, setOpenFile]
  );

  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Ctrl+S handler
      editor.addCommand(
        // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyS = 2048 + 49
        2097,
        () => {
          handleSave();
        }
      );
    },
    [handleSave]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? '';
      setEditorContent(newContent);

      // Debounced cache update
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (openFile) {
          setCachedFile(openFile, newContent);
        }
      }, 500);
    },
    [openFile, setCachedFile]
  );

  const currentLanguage = openFile ? getLanguage(getFileName(openFile)) : 'plaintext';

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0a0a0a] px-3 py-1.5">
        <div className="flex items-center gap-2">
          {openFile && (
            <span className="font-mono text-xs text-[#525252]">{openFile}</span>
          )}
          {loadingFile && (
            <span className="text-[10px] text-gray-600">Loading...</span>
          )}
          {fileError && (
            <span className="text-[10px] text-red-400">{fileError}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !openFile}
            className="flex items-center gap-1 rounded border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 text-[10px] font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-40"
            title="Save (Ctrl+S)"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleRun}
            disabled={executing || !openFile}
            className="flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-40"
            title="Run file"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
            {executing ? 'Running...' : 'Run'}
          </button>
          {running && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-500"
              title="Stop running process"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <rect x="3" y="3" width="10" height="10" rx="1" />
              </svg>
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-48 shrink-0">
          <FileTree
            files={fileList}
            activeFile={openFile}
            onFileSelect={handleFileSelect}
            onNewFile={handleNewFile}
          />
        </div>

        {/* Monaco editor */}
        <div className="flex-1">
          {openFile ? (
            <Editor
              height="100%"
              language={currentLanguage}
              value={editorContent}
              theme="vs-dark"
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-600">
              Select a file to edit
            </div>
          )}
        </div>
      </div>

      {/* Output panel */}
      <div className="flex flex-col border-t border-[#1f1f1f]">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0a0a0a] px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#525252]">
            Output
          </span>
          <button
            onClick={() => setOutput('')}
            className="rounded px-1.5 py-0.5 text-[10px] text-gray-600 transition-colors hover:text-[#525252]"
          >
            Clear
          </button>
        </div>
        <div className="h-36 overflow-y-auto bg-[#0a0a0a] p-3">
          <pre className="whitespace-pre-wrap font-mono text-xs text-[#525252]">
            {output || 'Run your code to see output here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
