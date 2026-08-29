import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/types";

const links = [
  { href: "/home", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/test", label: "Test" },
  { href: "/results", label: "Results" },
  { href: "/admin", label: "Admin" },
];

interface NavBarProps {
  role?: Role;
}

export function NavBar({ role = "LEARNER" }: NavBarProps) {
  const visible = role === "MASTER_ADMIN" || role === "ADMIN" ? links : links.filter((l) => l.href !== "/admin");
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Aptitude
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {visible.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Badge tone={role === "LEARNER" ? "neutral" : "primary"}>{role}</Badge>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-semibold text-muted">
            D
          </div>
        </div>
      </div>
    </header>
  );
}