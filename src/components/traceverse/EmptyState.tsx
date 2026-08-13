import type { ReactNode } from "react";

export function EmptyState({
  icon,
  line,
  action,
}: {
  icon: ReactNode;
  line: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl trace-gradient text-primary-foreground shadow-glow">
        {icon}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{line}</p>
      {action}
    </div>
  );
}
