"use client";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Stepper({ value, min, max, step = 1, onChange, disabled }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-foreground disabled:opacity-30 hover:bg-surface-2/70 cursor-pointer transition"
      >
        −
      </button>
      <span className="w-10 text-center font-display text-lg tabular-nums">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-foreground disabled:opacity-30 hover:bg-surface-2/70 cursor-pointer transition"
      >
        +
      </button>
    </div>
  );
}
