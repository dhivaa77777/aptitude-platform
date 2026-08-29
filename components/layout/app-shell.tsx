import type { ReactNode } from "react";
import { NavBar } from "@/components/layout/nav-bar";
import type { Role } from "@/lib/types";

interface AppShellProps {
  children: ReactNode;
  role?: Role;
}

export function AppShell({ children, role = "LEARNER" }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar role={role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}