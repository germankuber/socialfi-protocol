import type { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-8 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-hairline/10 bg-canvas-sunken text-ink-subtle">
          {icon}
        </div>
      ) : null}
      <div className="font-display text-xl font-medium text-ink">{title}</div>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-ink-muted text-balance">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
