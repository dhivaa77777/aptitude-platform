"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OptionsList } from "@/components/practice/options-list";
import { Stepper } from "@/components/ui/stepper";
import type { StepState } from "@/components/ui/stepper";
import { TimerPill } from "@/components/ui/timer-pill";

const steps: StepState[] = Array.from({ length: 20 }, (_, i) => i + 1).map(
  (n) => ({
    n,
    state: n === 1 ? "current" : n === 2 ? "answered" : "upcoming",
  }),
);

const question = {
  text: "In a certain code, MONKEY is written as XDJMNL. How is TIGER written in that code?",
};

const options = [
  { id: "opt-1", label: "A", text: "QDFHS" },
  { id: "opt-2", label: "B", text: "SDFHS" },
  { id: "opt-3", label: "C", text: "QCHDK" },
  { id: "opt-4", label: "D", text: "UJHFS" },
];

export default function TestPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stepper steps={steps} />
        <TimerPill time="17:42" />
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
        <Button variant="ghost">
          Previous
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost">Save &amp; exit</Button>
          <Button disabled={!selected}>
            Next question
          </Button>
        </div>
      </div>
    </>
  );
}