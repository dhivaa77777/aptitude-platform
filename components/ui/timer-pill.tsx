import type { HTMLAttributes } from "react";

interface TimerPillProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  time: string;
  low?: boolean;
}

export function TimerPill({
  label = "Time left",
  time,
  low = false,
  className = "",
  ...rest
}: TimerPillProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm tabular-nums ${
        low
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-border bg-surface-2 text-foreground"
      } ${className}`}
      {...rest}
    >
      <span className="text-xs font-sans uppercase tracking-widest opacity-70">
        {label}
      </span>
      {time}
    </div>
  );
}