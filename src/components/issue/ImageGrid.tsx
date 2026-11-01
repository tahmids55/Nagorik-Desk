import { cn } from "@/lib/cn";

/** 1–3 photos, thumbnails in lists and full size on the issue page. Supports lightbox click. */
export function ImageGrid({
  ids,
  full = false,
  alt,
  onImageClick,
}: {
  ids: string[];
  full?: boolean;
  alt: string;
  onImageClick?: (index: number) => void;
}) {
  if (ids.length === 0) return null;
  const count = ids.length;
  const size = full ? "" : "?s=thumb";
  const displayIds = count > 4 ? ids.slice(0, 4) : ids;
  const cols = count === 1 ? "grid-cols-1" : count === 2 || count === 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={cn("grid gap-1 overflow-hidden rounded-[3px]", cols)}>
      {displayIds.map((id, idx) => {
        const isMore = idx === 3 && count > 4;
        const content = (
          <div className="relative w-full h-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${id}${size}`}
              alt={alt}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full object-cover transition-opacity hover:opacity-95 active:opacity-85",
                count === 1
                  ? full
                    ? "max-h-[70vh] object-contain"
                    : "max-h-[300px] sm:max-h-[420px]"
                  : full
                  ? "aspect-[4/3]"
                  : "aspect-square"
              )}
            />
            {isMore && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-semibold text-white text-lg sm:text-xl tracking-wide backdrop-blur-[1px]">
                +{count - 3}
              </div>
            )}
          </div>
        );

        if (onImageClick) {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onImageClick(idx)}
              className="block w-full bg-raised text-left overflow-hidden focus:outline-none focus:ring-1 focus:ring-brand"
              aria-label={`${alt} (${idx + 1}/${ids.length})`}
            >
              {content}
            </button>
          );
        }

        return (
          <a
            key={id}
            href={`/api/media/${id}`}
            target="_blank"
            rel="noopener"
            className="block bg-raised overflow-hidden"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
