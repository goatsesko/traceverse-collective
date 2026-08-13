import type { ReactNode } from "react";

export function Rail({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="animate-rise">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">{children}</div>
    </section>
  );
}
