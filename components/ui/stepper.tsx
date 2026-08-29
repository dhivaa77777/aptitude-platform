export interface StepState {
  n: number;
  state: "current" | "answered" | "upcoming";
}

interface StepperProps {
  steps: StepState[];
  label?: string;
}

const stateClasses: Record<StepState["state"], string> = {
  current: "border-primary bg-primary text-primary-foreground",
  answered: "border-primary/40 bg-primary/15 text-primary-strong",
  upcoming: "border-border bg-surface-2 text-muted",
};

export function Stepper({ steps, label }: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          {i > 0 ? <div className="h-px w-3 bg-border" /> : null}
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${stateClasses[s.state]}`}
          >
            {s.state === "answered" ? "✓" : s.n}
          </div>
        </div>
      ))}
      {label ? (
        <span className="ml-2 text-xs text-muted">{label}</span>
      ) : null}
    </div>
  );
}