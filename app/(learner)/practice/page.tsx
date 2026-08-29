"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OptionsList } from "@/components/practice/options-list";

const question = {
  text: "A train 120 metres long crosses a platform 80 metres long in 10 seconds. What is the speed of the train?",
};

const options = [
  { id: "opt-1", label: "A", text: "12 m/s" },
  { id: "opt-2", label: "B", text: "20 m/s" },
  { id: "opt-3", label: "C", text: "15 m/s" },
  { id: "opt-4", label: "D", text: "18 m/s" },
];

export default function PracticePage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell role="LEARNER">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">Question 3 of 15</div>
        <Badge tone="warning">Level 3</Badge>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/5 rounded-full bg-primary" />
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-medium leading-relaxed">{question.text}</h2>
      </Card>

      <div className="mt-6">
        <OptionsList
          options={options}
          selectedId={selected}
          onChange={setSelected}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" disabled>
          Previous
        </Button>
        <Button disabled={!selected}>Next question</Button>
      </div>
    </AppShell>
  );
}