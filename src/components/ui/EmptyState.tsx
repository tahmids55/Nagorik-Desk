import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Every empty list explains what will appear here and how to add the first item. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-8 text-left">
      <Icon className="mb-3 h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden="true" />
      <h2 className="text-base font-semibold">{title}</h2>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
