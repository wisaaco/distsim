'use client';

import { useState, useCallback } from 'react';

type ParamControl =
  | { type: 'slider'; key: string; label: string; min: number; max: number; step: number; unit: string; default: number }
  | { type: 'input'; key: string; label: string; placeholder: string }
  | { type: 'machine-select'; key: string; label: string };

interface ChaosActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'network' | 'process' | 'resource';
  controls: ParamControl[];
  buttonLabel: string;
  buttonVariant?: 'default' | 'danger';
  confirmMessage?: string;
  disabled: boolean;
  machines?: { id: string; hostname: string }[];
  currentMachineId?: string;
  onInject: (params: Record<string, string>) => void;
}

const categoryBorder: Record<string, string> = {
  network: 'border-[#2a2a2a]',
  process: 'border-[#ef4444]/20',
  resource: 'border-[#eab308]/20',
};

const categoryBg: Record<string, string> = {
  network: 'bg-[#141414]',
  process: 'bg-[#ef4444]/5',
  resource: 'bg-[#eab308]/5',
};

const buttonColor: Record<string, string> = {
  default: 'bg-[#22c55e] hover:bg-[#16a34a] text-black',
  danger: 'bg-[#ef4444] hover:bg-[#dc2626] text-white',
};

export default function ChaosActionCard({
  title,
  description,
  icon,
  category,
  controls,
  buttonLabel,
  buttonVariant = 'default',
  confirmMessage,
  disabled,
  machines,
  currentMachineId,
  onInject,
}: ChaosActionCardProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ctrl of controls) {
      if (ctrl.type === 'slider') {
        initial[ctrl.key] = String(ctrl.default);
      } else if (ctrl.type === 'input') {
        initial[ctrl.key] = '';
      } else if (ctrl.type === 'machine-select') {
        initial[ctrl.key] = '';
      }
    }
    return initial;
  });

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleInject = useCallback(() => {
    if (confirmMessage && !confirm(confirmMessage)) return;
    onInject(values);
  }, [values, confirmMessage, onInject]);

  const hasRequiredInputs = controls.every((ctrl) => {
    if (ctrl.type === 'input') return values[ctrl.key]?.trim() !== '';
    if (ctrl.type === 'machine-select') return values[ctrl.key] !== '';
    return true;
  });

  return (
    <div
      className={`rounded-lg border p-3 ${categoryBorder[category]} ${categoryBg[category]}`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="mb-3 text-[11px] text-[#525252]">{description}</p>

      <div className="space-y-2.5">
        {controls.map((ctrl) => {
          if (ctrl.type === 'slider') {
            return (
              <div key={ctrl.key}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] text-[#a1a1a1]">
                    {ctrl.label}
                  </label>
                  <span className="font-mono text-[11px] text-[#fafafa]">
                    {values[ctrl.key]}{ctrl.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={values[ctrl.key]}
                  onChange={(e) => handleChange(ctrl.key, e.target.value)}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#2a2a2a] accent-[#22c55e]"
                />
              </div>
            );
          }

          if (ctrl.type === 'input') {
            return (
              <div key={ctrl.key}>
                <label className="mb-1 block text-[11px] text-[#a1a1a1]">
                  {ctrl.label}
                </label>
                <input
                  type="text"
                  placeholder={ctrl.placeholder}
                  value={values[ctrl.key]}
                  onChange={(e) => handleChange(ctrl.key, e.target.value)}
                  className="w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 font-mono text-xs text-[#fafafa] placeholder-[#525252] focus:border-[#3a3a3a] focus:outline-none"
                />
              </div>
            );
          }

          if (ctrl.type === 'machine-select') {
            const filteredMachines = (machines ?? []).filter(
              (m) => m.id !== currentMachineId
            );
            return (
              <div key={ctrl.key}>
                <label className="mb-1 block text-[11px] text-[#a1a1a1]">
                  {ctrl.label}
                </label>
                <select
                  value={values[ctrl.key]}
                  onChange={(e) => handleChange(ctrl.key, e.target.value)}
                  className="w-full rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1 text-xs text-[#fafafa] focus:border-[#3a3a3a] focus:outline-none"
                >
                  <option value="">Select machine...</option>
                  {filteredMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.hostname}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return null;
        })}
      </div>

      <button
        onClick={handleInject}
        disabled={disabled || !hasRequiredInputs}
        className={`mt-3 w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${buttonColor[buttonVariant]}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
