'use client';

import { useState } from 'react';
import { SERVICE_HINTS, type ServiceHint, type CodeExample } from '@/lib/service-hints';

interface ServiceHintPanelProps {
  serviceType: string;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] transition-colors ${copied ? 'text-[#22c55e]' : 'text-[#525252] hover:bg-[#2a2a2a] hover:text-[#a1a1a1]'}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CollapsibleSection({ label, count, defaultOpen, children }: { label: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-[#1f1f1f]"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 text-[#525252] transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-[#a1a1a1]">{label}</span>
        {count !== undefined && (
          <span className="rounded-full bg-[#1f1f1f] px-1.5 py-0.5 text-[9px] text-[#525252]">{count}</span>
        )}
      </button>
      {open && <div className="mt-1.5 pl-5">{children}</div>}
    </div>
  );
}

function CommandList({ items }: { items: { command: string; description: string }[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-[#1f1f1f] bg-[#0a0a0a] p-2">
          <div className="flex items-start justify-between gap-2">
            <code className="break-all font-mono text-[11px] leading-relaxed text-[#22c55e]">{item.command}</code>
            <CopyButton text={item.command} />
          </div>
          {item.description && (
            <p className="mt-1 text-[11px] leading-relaxed text-[#525252]">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ServiceHintPanel({ serviceType, onClose }: ServiceHintPanelProps) {
  const hint: ServiceHint | undefined = SERVICE_HINTS[serviceType.toLowerCase()];

  if (!hint) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" onClick={onClose} />
        <div className="relative z-10 rounded-xl border border-[#1f1f1f] bg-[#141414] p-6">
          <p className="text-sm text-[#a1a1a1]">No hints available for {serviceType}.</p>
          <button onClick={onClose} className="mt-3 rounded-md border border-[#2a2a2a] px-4 py-2 text-sm text-white hover:bg-[#0a0a0a]">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 mx-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1f1f1f] bg-[#141414]">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[#1f1f1f] bg-[#141414] px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{hint.title}</h3>
              {hint.ports.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {hint.ports.map((p) => (
                    <span key={p.port} className="rounded border border-[#2a2a2a] bg-[#0a0a0a] px-1.5 py-0.5 text-[10px]">
                      <span className="font-mono font-bold text-[#22c55e]">{p.port}</span>
                      <span className="ml-1 text-[#525252]">{p.description}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="rounded p-1 text-[#525252] hover:bg-[#0a0a0a] hover:text-[#a1a1a1]">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Description */}
          <p className="mb-5 text-[13px] leading-relaxed text-[#a1a1a1]">{hint.description}</p>

          {/* Installation — always open */}
          {hint.install.length > 0 && (
            <CollapsibleSection label="Installation" count={hint.install.length} defaultOpen>
              <CommandList items={hint.install.map((cmd) => ({ command: cmd, description: '' }))} />
            </CollapsibleSection>
          )}

          {/* Config Files */}
          {hint.config_files.length > 0 && (
            <CollapsibleSection label="Config Files" count={hint.config_files.length}>
              <div className="space-y-1.5">
                {hint.config_files.map((f) => (
                  <div key={f.path} className="rounded-md border border-[#1f1f1f] bg-[#0a0a0a] p-2">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-[11px] text-[#eab308]">{f.path}</code>
                      <CopyButton text={f.path} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#525252]">{f.description}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Common Commands */}
          {hint.common_commands.length > 0 && (
            <CollapsibleSection label="Common Commands" count={hint.common_commands.length}>
              <CommandList items={hint.common_commands} />
            </CollapsibleSection>
          )}

          {/* Test Commands */}
          {hint.test_commands.length > 0 && (
            <CollapsibleSection label="Test It Works" count={hint.test_commands.length} defaultOpen>
              <CommandList items={hint.test_commands} />
            </CollapsibleSection>
          )}

          {/* Code Examples */}
          {hint.code_examples && hint.code_examples.length > 0 && (
            <CollapsibleSection label="Code Examples" count={hint.code_examples.length} defaultOpen>
              <div className="space-y-3">
                {hint.code_examples.map((ex: CodeExample, i: number) => (
                  <div key={i} className="rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#1f1f1f] px-1.5 py-0.5 text-[9px] font-mono text-[#525252]">{ex.language}</span>
                        <span className="text-[11px] font-medium text-[#a1a1a1]">{ex.title}</span>
                      </div>
                      <CopyButton text={ex.code} />
                    </div>
                    {ex.description && (
                      <div className="border-b border-[#1f1f1f] px-3 py-1.5">
                        <p className="text-[11px] text-[#525252]">{ex.description}</p>
                      </div>
                    )}
                    <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-[#a1a1a1]">
                      {ex.code}
                    </pre>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Tips */}
          {hint.tips.length > 0 && (
            <CollapsibleSection label="Tips & Best Practices" count={hint.tips.length}>
              <ul className="space-y-2">
                {hint.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#a1a1a1]">
                    <span className="mt-0.5 shrink-0 text-[#22c55e]">*</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
