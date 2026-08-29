import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted border border-border",
  primary: "bg-primary/15 text-primary-strong border border-primary/30",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className = "", ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...rest}
    />
  );
}