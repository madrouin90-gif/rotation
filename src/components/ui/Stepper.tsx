"use client";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** "sm" pour les contextes étroits (ex. carte de partage sur mobile) — évite tout débordement. */
  size?: "md" | "sm";
}

export function Stepper({ value, min, max, step = 1, onChange, disabled, size = "md" }: StepperProps) {
  const compact = size === "sm";
  return (
    <div className={`flex items-center ${compact ? "gap-1.5" : "gap-3"}`}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className={`rounded-lg bg-surface-2 border border-border text-foreground disabled:opacity-30 hover:bg-surface-2/70 cursor-pointer transition ${
          compact ? "w-6 h-6 text-sm" : "w-8 h-8"
        }`}
      >
        −
      </button>
      <span
        className={`text-center font-display tabular-nums ${compact ? "w-6 text-sm" : "w-10 text-lg"}`}
      >
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className={`rounded-lg bg-surface-2 border border-border text-foreground disabled:opacity-30 hover:bg-surface-2/70 cursor-pointer transition ${
          compact ? "w-6 h-6 text-sm" : "w-8 h-8"
        }`}
      >
        +
      </button>
    </div>
  );
}
