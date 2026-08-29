import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...rest }: InputProps) {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted focus:border-primary-strong focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}