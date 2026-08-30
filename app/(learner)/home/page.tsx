import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

const prepFields = ["Quantitative Aptitude", "Logical Reasoning"];

const weakTopics = [
  { topic: "Time, Speed & Distance", score: 46 },
  { topic: "Data Sufficiency", score: 52 },
  { topic: "Clock, Calendar & Ages", score: 58 },
];

export default function LearnerHomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a field, train your weak topics, then take a timed test to prove
        the progress.
      </p>

      <section className="mt-8">
        <CardHeader title="Your preparation fields" subtitle="Editable in settings." />
        <div className="flex flex-wrap gap-2">
          {prepFields.map((f) => (
            <Badge key={f} tone="primary">
              {f}
            </Badge>
          ))}
          <Badge tone="neutral">+ Add field</Badge>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Practice"
            subtitle="Choose field, topic and difficulty. No time pressure."
          />
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-muted">Field</span>
              <span className="font-medium">Quantitative Aptitude</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-muted">Topic</span>
              <span className="font-medium">Time, Speed &amp; Distance</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <span className="text-muted">Difficulty</span>
              <span className="font-medium">Level 3</span>
            </div>
          </div>
          <Link href="/practice" className="mt-4 block w-full">
            <Button className="w-full">Start practice</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader
            title="Timed test"
            subtitle="Sequential navigation, countdown and auto-submit on timeout."
          />
          <ul className="space-y-2 text-sm text-muted">
            <li>20 questions from selected field and topic</li>
            <li>20 minutes, server-enforced order</li>
            <li>Full result snapshot with topic breakdown</li>
          </ul>
          <Link href="/test" className="mt-4 block w-full">
            <Button variant="secondary" className="w-full">
              Start timed test
            </Button>
          </Link>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weak topics" subtitle="Rule-based, from your practice history." />
          <ul className="divide-y divide-border">
            {weakTopics.map((t) => (
              <li key={t.topic} className="flex items-center justify-between py-3">
                <span className="text-sm text-foreground">{t.topic}</span>
                <Badge tone={t.score < 50 ? "danger" : "warning"}>
                  {t.score}%
                </Badge>
              </li>
            ))}
            <li className="pt-3">
              <Link href="/practice" className="text-sm font-medium text-primary-strong">
                Practice these topics
              </Link>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent attempts" />
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between py-3">
              <span className="text-foreground">Timed test — QA Level 3</span>
              <span className="font-medium text-success">72%</span>
            </li>
            <li className="flex items-center justify-between py-3">
              <span className="text-foreground">Practice — Data Sufficiency</span>
              <span className="text-muted">16 questions</span>
            </li>
            <li className="flex items-center justify-between py-3">
              <span className="text-foreground">Timed test — LR Level 2</span>
              <span className="font-medium text-warning">58%</span>
            </li>
          </ul>
        </Card>
      </section>
    </>
  );
}