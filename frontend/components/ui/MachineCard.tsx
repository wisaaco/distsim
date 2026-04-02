'use client';

import type { Machine } from '@/lib/types';
import StatusBadge from './StatusBadge';

export default function MachineCard({ machine }: { machine: Machine }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-100">{machine.hostname}</h3>
        <StatusBadge status={machine.status} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">IP</span>
          <span className="font-mono text-gray-300">{machine.ip}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Container</span>
          <span className="font-mono text-xs text-gray-400">
            {machine.container_id ? machine.container_id.slice(0, 12) : 'N/A'}
          </span>
        </div>

        {machine.services.length > 0 && (
          <div className="pt-2">
            <span className="mb-1.5 block text-xs text-gray-500">Services</span>
            <div className="flex flex-wrap gap-1.5">
              {machine.services.map((service) => (
                <span
                  key={service.id}
                  className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                >
                  {service.type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
