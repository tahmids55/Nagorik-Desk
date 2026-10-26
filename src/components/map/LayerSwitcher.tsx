"use client";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { TILE_LABELS, TILE_STYLES, type TileStyle } from "@/lib/maps/tiles";

/** Map / satellite switch. Sits on top of the map, so it needs its own stacking above Leaflet's panes. */
export function LayerSwitcher({ value, onChange, className }: { value: TileStyle; onChange: (s: TileStyle) => void; className?: string }) {
  const { lang } = useI18n();
  const labels = TILE_LABELS[lang === "bn" ? "bn" : "en"];
  return (
    <div className={cn("absolute z-[1000] flex overflow-hidden rounded-[3px] border border-line-strong bg-surface", className)} role="group">
      {TILE_STYLES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={cn("px-3 py-1.5 text-xs font-medium", value === s ? "bg-ink text-surface" : "text-ink-secondary hover:bg-neutral-fill hover:text-ink")}
        >
          {labels[s]}
        </button>
      ))}
    </div>
  );
}
