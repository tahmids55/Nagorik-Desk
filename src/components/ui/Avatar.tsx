import { cn } from "@/lib/cn";

const SIZES = { xs: "h-6 w-6 text-[11px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-28 w-28 text-4xl" } as const;

/** Photo if there is one, otherwise the initial on a small rounded square. Anonymous gets a neutral glyph. */
export function Avatar({
  name,
  mediaId,
  size = "md",
  anonymous = false,
  className,
}: {
  name: string;
  mediaId?: string | null;
  size?: keyof typeof SIZES;
  anonymous?: boolean;
  className?: string;
}) {
  const base = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none", SIZES[size], className);
  if (mediaId && !anonymous) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/media/${mediaId}?s=thumb`} alt="" className={cn(base, "object-cover")} loading="lazy" />;
  }
  const initial = anonymous ? "?" : (Array.from(name.trim())[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        base,
        anonymous ? "bg-neutral-fill text-muted border border-line" : "bg-neutral-fill text-ink border border-line"
      )}
    >
      {initial}
    </span>
  );
}
