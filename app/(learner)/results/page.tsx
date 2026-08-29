import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

const topicBreakdown = [
  { topic: "Number Systems", attempts: 24, correct: 19, avgTime: "42s" },
  { topic: "Percentages", attempts: 18, correct: 13, avgTime: "38s" },
  { topic: "Time, Speed & Distance", attempts: 15, correct: 7, avgTime: "61s" },
  { topic: "Data Sufficiency", attempts: 12, correct: 6, avgTime: "75s" },
];

const recommendations = [
  "Revise Time, Speed & Distance — accuracy below 50% in the last 14 days.",
  "Increase difficulty to Level 4 for Number Systems once accuracy stays above 80%.",
  "Attempt a 20-question timed test on Time, Speed & Distance this week.",
];

export default function ResultsPage() {
  return (
    <AppShell role="LEARNER">
      <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
      <p className="mt-1 text-sm text-muted">
        Deterministic scoring with a topic-level breakdown.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <div className="text-4xl font-semibold text-primary-strong">72%</div>
          <p className="mt-1 text-sm text-muted">Score</p>
        </Card>
        <Card className="text-center">
          <div className="text-4xl font-semibold text-success">15/20</div>
          <p className="mt-1 text-sm text-muted">Correct</p>
        </Card>
        <Card className="text-center">
          <div className="text-4xl font-semibold">18:04</div>
          <p className="mt-1 text-sm text-muted">Time taken</p>
        </Card>
      </section>

      <section className="mt-8">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="Topic breakdown" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Topic</th>
                  <th className="px-5 py-3 font-medium">Attempts</th>
                  <th className="px-5 py-3 font-medium">Correct</th>
                  <th className="px-5 py-3 font-medium">Acc.</th>
                  <th className="px-5 py-3 font-medium">Avg time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topicBreakdown.map((r) => {
                  const acc = Math.round((r.correct / r.attempts) * 100);
                  return (
                    <tr key={r.topic}>
                      <td className="px-5 py-3 font-medium text-foreground">{r.topic}</td>
                      <td className="px-5 py-3 text-muted">{r.attempts}</td>
                      <td className="px-5 py-3 text-muted">{r.correct}</td>
                      <td className="px-5 py-3">
                        <Badge tone={acc < 50 ? "danger" : acc < 70 ? "warning" : "success"}>{acc}%</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">{r.avgTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader
            title="Recommendations"
            subtitle="Generated from thresholds on your topic stats."
          />
          <ul className="space-y-2">
            {recommendations.map((r) => (
              <li key={r} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-strong" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}