"use client";

interface Option {
  id: string;
  text: string;
  label: string;
}

interface OptionsListProps {
  options: Option[];
  selectedId: string | null;
  onChange: (id: string) => void;
  showCorrect?: boolean;
  correctId?: string | null;
}

export function OptionsList({
  options,
  selectedId,
  onChange,
  showCorrect = false,
  correctId = null,
}: OptionsListProps) {
  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const selected = selectedId === opt.id;
        const isCorrect = showCorrect && correctId === opt.id;
        const isWrong = showCorrect && selected && correctId !== opt.id;
        const base =
          "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
        const look = isCorrect
          ? "border-success/50 bg-success/10 text-success"
          : isWrong
            ? "border-danger/50 bg-danger/10 text-danger"
            : selected
              ? "border-primary bg-primary/15 text-foreground"
              : "border-border bg-surface-2 text-foreground hover:bg-surface-3";
        return (
          <button key={opt.id} type="button" className={`${base} ${look}`} onClick={() => onChange(opt.id)}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                selected || showCorrect ? "border-current" : "border-border-strong text-muted"
              }`}
            >
              {opt.label}
            </span>
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}