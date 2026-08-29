import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Aptitude</h1>
          <p className="mt-1 text-sm text-muted">Practice. Assess. Improve.</p>
        </div>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Sign in</h2>
          <form className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm text-foreground">
                Email
              </label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm text-foreground">
                Password
              </label>
              <Input id="password" type="password" placeholder="Password" />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <Link href="/home" className="block w-full">
              <Button variant="secondary" className="w-full">
                Continue as guest
              </Button>
            </Link>
            <p className="text-center text-sm text-muted">
              New here?{" "}
              <Link href="#" className="font-medium text-primary-strong">
                Create an account
              </Link>
            </p>
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-muted">
          Role routing happens automatically after sign-in.
        </p>
      </div>
    </main>
  );
}