'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiDelete } from '@/lib/api';
import type { Session } from '@/lib/types';

/* ---------- SVG Icons ---------- */
function ServerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8H3V4h18v4zM21 14H3v-4h18v4zM21 20H3v-4h18v4zM7 6h.01M7 12h.01M7 18h.01" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" />
    </svg>
  );
}

/* ---------- Feature cards ---------- */
const features = [
  {
    title: 'Build Real Infrastructure',
    description:
      'Spin up servers, install services, configure networking. Each machine runs Linux with a full terminal.',
    icon: <ServerIcon className="h-5 w-5" />,
  },
  {
    title: 'Break Things Safely',
    description:
      'Inject network delays, kill processes, fill disks. Watch your system fail and learn to make it resilient.',
    icon: <BoltIcon className="h-5 w-5" />,
  },
  {
    title: 'Learn by Doing',
    description:
      'Structured lessons from single-server to Netflix-scale. Understand the 6 layers every company uses.',
    icon: <BookIcon className="h-5 w-5" />,
  },
];

/* ---------- How it works steps ---------- */
const steps = [
  {
    step: '01',
    title: 'Choose a Template',
    description: 'Pick a company size -- small startup (3 machines), medium company (10), or large enterprise (16+).',
  },
  {
    step: '02',
    title: 'See Your Infrastructure',
    description: 'View your machines on an interactive canvas. Each node is a real Linux container with networking.',
  },
  {
    step: '03',
    title: 'Install & Configure',
    description: 'Install Nginx, PostgreSQL, Redis, Kafka -- configure services, write code, open terminals.',
  },
  {
    step: '04',
    title: 'Break It & Learn',
    description: 'Inject chaos -- network delays, process kills, disk pressure. Watch failures cascade.',
  },
];

/* ---------- Architecture layers ---------- */
const layers = [
  { num: 1, name: 'Traffic Entry', desc: 'CDN, Load Balancer, API Gateway' },
  { num: 2, name: 'Orchestration', desc: 'Kubernetes, container scheduling' },
  { num: 3, name: 'Service Mesh', desc: 'Discovery, retries, circuit breakers' },
  { num: 4, name: 'Data', desc: 'PostgreSQL, Redis, Cassandra' },
  { num: 5, name: 'Messaging', desc: 'Kafka, RabbitMQ, event streams' },
  { num: 6, name: 'Observability', desc: 'Prometheus, Grafana, Jaeger' },
];

/* ---------- Component ---------- */
export default function HomePage() {
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiGet<Session[]>('/api/sessions');
      setRecentSessions((data || []).slice(0, 5));
    } catch {
      // silently fail -- sessions are optional on landing page
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Delete this session? All machines will be destroyed.')) return;
    try {
      await apiDelete(`/api/sessions/${id}`);
      await fetchSessions();
    } catch {
      // ignore
    }
  };

  const formatTime = (iso: string) => {
    try {
      const now = new Date();
      const date = new Date(iso);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const statusDotColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-[#22c55e]';
      case 'creating': return 'bg-[#eab308]';
      default: return 'bg-[#ef4444]';
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ========== Hero ========== */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Build. Break. Learn.
            </h1>
            <p className="mt-4 text-base text-[#a1a1a1]">
              Simulate real distributed infrastructure -- no cloud bills, no VPS needed.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 rounded-md border border-[#2a2a2a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#3a3a3a] hover:bg-[#141414]"
              >
                Start Learning
              </Link>
              <Link
                href="/labs?create=true"
                className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#16a34a]"
              >
                Create Lab
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="mt-6 text-xs text-[#525252]">
              Free &middot; No signup required &middot; Runs on your machine
            </p>
          </div>

          {/* Hero screenshot */}
          <div className="mx-auto mt-16 max-w-5xl px-6">
            <div className="overflow-hidden rounded-xl border border-[#1f1f1f] shadow-2xl shadow-black/50">
              <img
                src="/screenshot-workspace.png"
                alt="DistSim workspace — visual topology editor with machines, services, and connections"
                className="w-full"
                width={1400}
                height={788}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========== Features ========== */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#1f1f1f] bg-[#141414] p-6 transition-colors hover:border-[#2a2a2a]"
            >
              <div className="mb-4 text-[#a1a1a1]">
                {f.icon}
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#a1a1a1]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== How It Works ========== */}
      <section className="border-y border-[#1f1f1f]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-white">
            How It Works
          </h2>
          <p className="mb-12 text-center text-sm text-[#525252]">
            From zero to a distributed system in four steps
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step}>
                <div className="mb-3 font-mono text-xs font-bold text-[#22c55e]">{s.step}</div>
                <h3 className="mb-2 text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[#a1a1a1]">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Architecture Preview ========== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-white">
          The 6 Layers of Every Company
        </h2>
        <p className="mb-12 text-center text-sm text-[#525252]">
          From Netflix to a 10-person startup -- every company converges on the same architecture
        </p>

        <div className="mx-auto max-w-2xl space-y-2">
          {layers.map((l) => (
            <div
              key={l.num}
              className="flex items-center gap-4 rounded-xl border border-[#1f1f1f] bg-[#141414] px-5 py-4 transition-colors hover:border-[#2a2a2a]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#0a0a0a] font-mono text-xs font-bold text-[#a1a1a1]">
                {l.num}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{l.name}</div>
                <div className="text-xs text-[#525252]">{l.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#a1a1a1] transition-colors hover:text-white"
          >
            Learn about each layer
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ========== Recent Labs ========== */}
      {!loadingSessions && recentSessions.length > 0 && (
        <section className="border-t border-[#1f1f1f]">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-white">Recent Labs</h2>
              <Link
                href="/labs"
                className="text-sm text-[#525252] transition-colors hover:text-[#a1a1a1]"
              >
                View all
              </Link>
            </div>

            <div className="divide-y divide-[#1f1f1f] rounded-xl border border-[#1f1f1f]">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-[#141414]"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(session.status)}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {session.name}
                  </span>
                  <span className="hidden text-xs font-mono text-[#525252] sm:inline">
                    {session.template}
                  </span>
                  <span className="text-xs text-[#525252]">
                    {session.machines ? session.machines.length : 0} machines
                  </span>
                  <span className="text-xs text-[#525252]">
                    {formatTime(session.created_at)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="rounded p-1 text-[#525252] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== Footer ========== */}
      <footer className="border-t border-[#1f1f1f]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#141414] font-mono text-[10px] font-bold text-[#a1a1a1]">
                DS
              </div>
              <span className="text-xs text-[#525252]">Built for engineers who learn by building</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#525252] transition-colors hover:text-[#a1a1a1]"
              >
                GitHub
              </a>
              <Link
                href="/learn"
                className="text-xs text-[#525252] transition-colors hover:text-[#a1a1a1]"
              >
                Learn
              </Link>
              <Link
                href="/labs?create=true"
                className="text-xs text-[#525252] transition-colors hover:text-[#a1a1a1]"
              >
                Create Lab
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
