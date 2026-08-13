import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, Plus, Users, User, Search, Sparkles, Bell } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Shell({
  children,
  title,
  showSearch = true,
}: {
  children: ReactNode;
  title?: string;
  showSearch?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="sticky top-0 z-30 glass">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl trace-gradient text-primary-foreground shadow-glow">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {title ?? "TraceVerse"}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {showSearch ? (
              <Link
                to="/search"
                aria-label="Search TraceVerse"
                className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="size-4" />
              </Link>
            ) : null}
            <button
              type="button"
              aria-label="Notifications"
              className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-32">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5">
        <div className="glass flex w-full max-w-md items-center justify-between rounded-3xl px-3 py-2 shadow-float">
          {tabs.slice(0, 2).map((t) => (
            <NavItem key={t.to} {...t} active={pathname === t.to} />
          ))}
          <Link
            to="/create"
            aria-label="Create"
            className="grid size-13 -translate-y-4 place-items-center rounded-2xl trace-gradient text-primary-foreground shadow-glow animate-trace-pulse transition-transform duration-300 hover:scale-105"
          >
            <Plus className="size-6" />
          </Link>
          {tabs.slice(2).map((t) => (
            <NavItem key={t.to} {...t} active={pathname.startsWith(t.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("size-5", active && "text-primary")} />
      {label}
    </Link>
  );
}
