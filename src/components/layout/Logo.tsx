import Link from "next/link";

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Nagorik Desk">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="3" fill="var(--brand)" />
        <path
          d="M17 7.5c-3.9 0-7 3-7 6.9 0 4.9 5.6 10.4 6.3 11.1.4.4 1 .4 1.4 0 .7-.7 6.3-6.2 6.3-11.1 0-3.9-3.1-6.9-7-6.9Z"
          fill="var(--btn-primary-text)"
        />
        <circle cx="17" cy="14.2" r="2.8" fill="var(--brand)" />
      </svg>
      {withText && (
        <span className="text-[17px] font-semibold tracking-tight">
          Nagorik <span className="text-brand">Desk</span>
        </span>
      )}
    </Link>
  );
}
