'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiPost } from '@/lib/api';
import type { Machine } from '@/lib/types';

interface APITesterPanelProps {
  sessionId: string;
  machine: Machine;
  onClose: () => void;
}

interface APIResponse {
  status_code: number;
  headers: Record<string, string>;
  body: string;
  duration: string;
  error?: string;
}

interface BulkResponse {
  total_requests: number;
  successful: number;
  failed: number;
  total_duration: string;
  avg_duration: string;
  req_per_second: number;
  status_codes: Record<string, number>;
  error?: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const methodColors: Record<string, string> = {
  GET: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
  POST: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
  PUT: 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30',
  DELETE: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
  PATCH: 'bg-[#a855f7]/20 text-[#a855f7] border-[#a855f7]/30',
};

const statusColor = (code: number): string => {
  if (code >= 200 && code < 300) return 'text-[#22c55e]';
  if (code >= 300 && code < 400) return 'text-[#eab308]';
  if (code >= 400 && code < 500) return 'text-[#f97316]';
  return 'text-[#ef4444]';
};

export default function APITesterPanel({ sessionId, machine, onClose }: APITesterPanelProps) {
  const [method, setMethod] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('distsim-api-method') || 'GET';
    return 'GET';
  });
  const [url, setUrl] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('distsim-api-url') || 'http://';
    return 'http://';
  });
  const [body, setBody] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('distsim-api-body') || '';
    return '';
  });
  const [headers, setHeaders] = useState('');
  // Persist to localStorage
  useEffect(() => { localStorage.setItem('distsim-api-method', method); }, [method]);
  useEffect(() => { localStorage.setItem('distsim-api-url', url); }, [url]);
  useEffect(() => { localStorage.setItem('distsim-api-body', body); }, [body]);

  const [response, setResponse] = useState<APIResponse | null>(null);
  const [bulkResponse, setBulkResponse] = useState<BulkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkCount, setBulkCount] = useState(100);
  const [bulkConcurrency, setBulkConcurrency] = useState(10);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setBulkResponse(null);

    const headerMap: Record<string, string> = {};
    headers.split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        headerMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    try {
      if (mode === 'bulk') {
        const result = await apiPost<BulkResponse>(
          `/api/sessions/${sessionId}/machines/${machine.id}/api-test`,
          { method, url, headers: headerMap, body, count: bulkCount, concurrency: bulkConcurrency }
        );
        setBulkResponse(result);
      } else {
        const result = await apiPost<APIResponse>(
          `/api/sessions/${sessionId}/machines/${machine.id}/api-test`,
          { method, url, headers: headerMap, body }
        );
        setResponse(result);
      }
    } catch (err) {
      if (mode === 'bulk') {
        setBulkResponse({ total_requests: 0, successful: 0, failed: 0, total_duration: '', avg_duration: '', req_per_second: 0, status_codes: {}, error: err instanceof Error ? err.message : 'Failed' });
      } else {
        setResponse({ status_code: 0, headers: {}, body: '', duration: '', error: err instanceof Error ? err.message : 'Failed' });
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, machine.id, method, url, body, headers, mode, bulkCount, bulkConcurrency]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 mx-auto mt-8 flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#141414]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">API Tester</span>
            <span className="rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-0.5 font-mono text-xs text-[#525252]">
              {machine.hostname} ({machine.ip})
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[#525252] hover:bg-[#0a0a0a] hover:text-[#a1a1a1]">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 border-b border-[#1f1f1f] px-4 py-2">
          <div className="flex rounded-md border border-[#2a2a2a] p-0.5">
            <button
              onClick={() => setMode('single')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === 'single' ? 'bg-[#2a2a2a] text-white' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
            >
              Single
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === 'bulk' ? 'bg-[#eab308]/20 text-[#eab308]' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
            >
              Load Test
            </button>
          </div>
          {mode === 'bulk' && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-[#a1a1a1]">
                Requests:
                <input
                  type="number"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#fafafa]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#a1a1a1]">
                Concurrency:
                <input
                  type="number"
                  value={bulkConcurrency}
                  onChange={(e) => setBulkConcurrency(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#fafafa]"
                />
              </label>
            </div>
          )}
        </div>

        {/* Request bar */}
        <div className="flex items-center gap-2 border-b border-[#1f1f1f] px-4 py-3">
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setShowBody(e.target.value !== 'GET' && e.target.value !== 'DELETE');
            }}
            className={`rounded-md border px-3 py-2 text-xs font-bold ${methodColors[method] ?? 'bg-[#0a0a0a] text-[#a1a1a1] border-[#2a2a2a]'}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://app-server:8080/api/users"
            className="flex-1 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#fafafa] placeholder-[#525252] outline-none focus:border-[#22c55e]"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          <button
            onClick={handleSend}
            disabled={loading || !url}
            className="rounded-md bg-[#22c55e] px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Request body / headers tabs */}
        <div className="border-b border-[#1f1f1f]">
          <div className="flex">
            <button
              onClick={() => setShowBody(!showBody)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${showBody ? 'border-b-2 border-[#22c55e] text-white' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
            >
              Body
            </button>
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${showHeaders ? 'border-b-2 border-[#22c55e] text-white' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
            >
              Headers
            </button>
          </div>

          {showBody && (
            <div className="px-4 py-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className="w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] p-3 font-mono text-xs text-[#fafafa] placeholder-[#525252] outline-none focus:border-[#22c55e]"
              />
            </div>
          )}

          {showHeaders && (
            <div className="px-4 py-2">
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder={'Authorization: Bearer token123\nContent-Type: application/json'}
                rows={3}
                className="w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] p-3 font-mono text-xs text-[#fafafa] placeholder-[#525252] outline-none focus:border-[#22c55e]"
              />
            </div>
          )}
        </div>

        {/* Response */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {bulkResponse ? (
            <>
              <div className="border-b border-[#1f1f1f] px-4 py-3">
                <div className="text-sm font-semibold text-white">Load Test Results</div>
              </div>
              <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4">
                {bulkResponse.error ? (
                  <div className="text-sm text-[#ef4444]">{bulkResponse.error}</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-3 text-center">
                        <div className="text-2xl font-bold text-white">{bulkResponse.total_requests}</div>
                        <div className="text-[10px] text-[#525252]">Total Requests</div>
                      </div>
                      <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 p-3 text-center">
                        <div className="text-2xl font-bold text-[#22c55e]">{bulkResponse.successful}</div>
                        <div className="text-[10px] text-[#525252]">Successful</div>
                      </div>
                      <div className="rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 p-3 text-center">
                        <div className="text-2xl font-bold text-[#ef4444]">{bulkResponse.failed}</div>
                        <div className="text-[10px] text-[#525252]">Failed</div>
                      </div>
                      <div className="rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-3 text-center">
                        <div className="text-2xl font-bold text-[#3b82f6]">{bulkResponse.req_per_second.toFixed(1)}</div>
                        <div className="text-[10px] text-[#525252]">Req/sec</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-3">
                        <div className="text-xs text-[#525252]">Total Duration</div>
                        <div className="font-mono text-lg font-bold text-white">{bulkResponse.total_duration}</div>
                      </div>
                      <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-3">
                        <div className="text-xs text-[#525252]">Avg Latency</div>
                        <div className="font-mono text-lg font-bold text-white">{bulkResponse.avg_duration}</div>
                      </div>
                    </div>
                    {Object.keys(bulkResponse.status_codes).length > 0 && (
                      <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-3">
                        <div className="mb-2 text-xs text-[#525252]">Status Codes</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(bulkResponse.status_codes).map(([code, count]) => (
                            <span
                              key={code}
                              className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${
                                code.startsWith('2') ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                                code.startsWith('4') ? 'bg-[#f97316]/10 text-[#f97316]' :
                                'bg-[#ef4444]/10 text-[#ef4444]'
                              }`}
                            >
                              {code}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : response ? (
            <>
              <div className="flex items-center gap-4 border-b border-[#1f1f1f] px-4 py-2">
                {response.error ? (
                  <span className="text-sm font-semibold text-[#ef4444]">Error: {response.error}</span>
                ) : (
                  <>
                    <span className={`text-lg font-bold ${statusColor(response.status_code)}`}>
                      {response.status_code}
                    </span>
                    <span className="text-xs text-[#525252]">{response.duration}</span>
                    <span className="text-xs text-[#525252]">
                      {response.body.length} bytes
                    </span>
                  </>
                )}

                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => setActiveTab('body')}
                    className={`rounded px-2 py-1 text-xs ${activeTab === 'body' ? 'bg-[#2a2a2a] text-white' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
                  >
                    Body
                  </button>
                  <button
                    onClick={() => setActiveTab('headers')}
                    className={`rounded px-2 py-1 text-xs ${activeTab === 'headers' ? 'bg-[#2a2a2a] text-white' : 'text-[#525252] hover:text-[#a1a1a1]'}`}
                  >
                    Headers ({Object.keys(response.headers).length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4">
                {activeTab === 'body' ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#a1a1a1]">
                    {response.body || '(empty response)'}
                  </pre>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#a1a1a1]">{key}:</span>
                        <span className="font-mono text-[#525252]">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[#525252]">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#22c55e] border-t-transparent" />
                  Sending request from {machine.hostname}...
                </div>
              ) : (
                'Enter a URL and click Send to make a request from this machine'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
