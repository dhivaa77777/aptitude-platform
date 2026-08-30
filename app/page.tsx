import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  "Targeted practice by field, topic and difficulty",
  "Timed, sequentially-locked assessments",
  "Deterministic scoring with topic-level breakdown",
];

export default function SplashPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-surface via-background to-background px-4 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2 text-2xl font-bold tracking-tight">
          A
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Aptitude Learning &amp; Assessment
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Practice, test and improve for MBA and placement aptitude. Pick a
          field, train your weak topics and retake timed assessments to track
          real progress.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full">
              Get started
            </Button>
          </Link>
        </div>
        <ul className="mt-12 grid w-full max-w-xl gap-3 sm:grid-cols-3">
          {features.map((f) => (
            <li
              key={f}
              className="rounded-xl border border-border bg-surface p-4 text-sm text-muted"
            >
              {f}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}