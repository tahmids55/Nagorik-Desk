import { cn } from "@/lib/cn";

/** Grey placeholder block. Pulses unless the visitor prefers reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[2px] bg-neutral-fill motion-reduce:animate-none", className)} aria-hidden="true" />;
}

export function PostCardSkeleton({ withImage = false }: { withImage?: boolean }) {
  return (
    <div className="card space-y-3 rounded-[4px] p-3 shadow-none sm:p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 !rounded-full sm:h-10 sm:w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      {withImage && <Skeleton className="h-44 w-full sm:h-56" />}
    </div>
  );
}

/** Wraps a page skeleton so screen readers hear a single "loading" status. */
export function LoadingShell({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}
