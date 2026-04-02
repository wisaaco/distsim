'use client';

type Status = 'creating' | 'running' | 'stopped' | 'error';

const dotColors: Record<Status, string> = {
  running: 'bg-[#22c55e]',
  creating: 'bg-[#eab308]',
  stopped: 'bg-[#ef4444]',
  error: 'bg-[#ef4444]',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotColors[status]}`} />
      <span className="text-xs text-[#525252]">{status}</span>
    </span>
  );
}
