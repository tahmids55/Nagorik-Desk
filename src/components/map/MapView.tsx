"use client";

import { ArrowBigUp, List, Locate, Map as MapIcon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { MarkerClusterGroup } from "leaflet";
import { StatusChip } from "@/components/ui/StatusChip";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { OVERDUE_VAR, STATUS_VAR } from "@/lib/maps/tiles";
import type { MapPinDTO } from "@/lib/types";
import { LayerSwitcher } from "./LayerSwitcher";
import { useLeafletMap } from "./useLeafletMap";

type Named = { id: string; name: string };
type Preview = { id: string; left: number; top: number; below: boolean };

const GROUPS = [
  { key: "all", statuses: null },
  { key: "open", statuses: ["open", "under_review"] },
  { key: "progress", statuses: ["assigned", "in_progress"] },
  { key: "resolved", statuses: ["resolved"] },
] as const;

const PREVIEW_W = 240;
const PIN_ROOT = "ngk-pin-root";

const pinColor = (p: MapPinDTO) => (p.overdue ? OVERDUE_VAR : (STATUS_VAR[p.status] ?? "var(--status-new)"));

function pinIcon(L: typeof Leaflet, p: MapPinDTO, selected: boolean, lang: "en" | "bn") {
  const color = pinColor(p);
  const vote = formatNumber(p.score, lang);
  const width = Math.max(26, 16 + vote.length * 6);
  const height = 26;
  const cls = ["map-pin", p.isUrgent && "is-urgent", !p.precise && "is-faded", selected && "is-selected"].filter(Boolean).join(" ");
  return L.divIcon({
    className: PIN_ROOT,
    html: `<div class="${cls}" data-pin="${p.id}" data-selected="${selected}" style="--c:${color};background:${color};width:${width}px;">${vote}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  });
}

export function MapView({ pins, categories, areas, focusId }: { pins: MapPinDTO[]; categories: Named[]; areas: Named[]; focusId?: string }) {
  const { t, lang } = useI18n();
  const { ref, map, L, style, setStyle } = useLeafletMap({ zoom: 10, upazilas: true });
  const [group, setGroup] = useState<(typeof GROUPS)[number]["key"]>("all");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [cluster, setCluster] = useState<MarkerClusterGroup | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const markers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const selectedRef = useRef<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const areaName = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const pinById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);

  const visible = useMemo(() => {
    const g = GROUPS.find((x) => x.key === group)!;
    return pins
      .filter((p) => (g.statuses ? (g.statuses as readonly string[]).includes(p.status) : p.status !== "rejected"))
      .filter((p) => !category || p.categoryId === category)
      .filter((p) => !area || p.upazilaId === area)
      .sort((a, b) => b.score - a.score);
  }, [pins, group, category, area]);

  const current = pinById.get(selected ?? "") ?? null;

  // Cluster group, created once the map exists.
  useEffect(() => {
    if (!map || !L) return;
    let cancelled = false;
    let group: MarkerClusterGroup | null = null;
    (async () => {
      await import("leaflet.markercluster");
      if (cancelled) return;
      group = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const size = n >= 100 ? 40 : 32;
          return L.divIcon({ html: `<span class="ngk-cluster">${formatNumber(n, lang)}</span>`, className: "ngk-cluster-root", iconSize: [size, size] });
        },
      });
      map.addLayer(group);
      setCluster(group);
    })();
    return () => {
      cancelled = true;
      if (group) map.removeLayer(group);
      setCluster(null);
    };
  }, [map, L, lang]);

  selectedRef.current = selected;

  // (Re)build markers whenever the filtered set changes.
  useEffect(() => {
    if (!map || !L || !cluster) return;
    cluster.clearLayers();
    const next = new Map<string, Leaflet.Marker>();
    const built: Leaflet.Marker[] = [];
    for (const p of visible) {
      const isSel = p.id === selectedRef.current;
      const m = L.marker([p.lat, p.lng], {
        icon: pinIcon(L, p, isSel, lang),
        title: p.title,
        alt: p.title,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: isSel ? 1000 : 0,
      });
      m.on("click", () => {
        setPreview(null);
        setSelected(p.id);
      });
      built.push(m);
      next.set(p.id, m);
    }
    cluster.addLayers(built);
    markers.current = next;
  }, [map, L, cluster, visible, lang]);

  // `/map?focus=<id>` (from an issue page): select that report and bring it into view, once.
  const focused = useRef(false);
  useEffect(() => {
    if (!focusId || focused.current || !map || !cluster) return;
    const p = pinById.get(focusId);
    if (!p) return;
    focused.current = true;
    setSelected(p.id);
    setMobileView("map");
    const m = markers.current.get(p.id);
    if (m) cluster.zoomToShowLayer(m);
    else map.setView([p.lat, p.lng], 15);
  }, [focusId, map, cluster, pinById, visible]);

  // Reflect the selection on the marker.
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    if (!L) return;
    for (const id of [prevSelected.current, selected]) {
      const m = id ? markers.current.get(id) : null;
      const p = id ? pinById.get(id) : null;
      if (m && p) {
        const isSel = id === selected;
        m.setIcon(pinIcon(L, p, isSel, lang));
        m.setZIndexOffset(isSel ? 1000 : 0);
      }
    }
    prevSelected.current = selected;
  }, [L, selected, pinById, lang]);

  // Hover and keyboard-focus preview. Delegated on the map container so it survives marker and cluster rebuilds.
  useEffect(() => {
    const el = ref.current;
    if (!map || !el) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    const show = (e: Event) => {
      const root = (e.target as HTMLElement | null)?.closest?.(`.${PIN_ROOT}`) as HTMLElement | null;
      const pinEl = (e.target as HTMLElement | null)?.closest?.("[data-pin]") as HTMLElement | null;
      const id = pinEl?.dataset.pin ?? root?.querySelector<HTMLElement>("[data-pin]")?.dataset.pin ?? root?.dataset.pin;
      if (!root || !id) return;
      const box = el.getBoundingClientRect();
      const r = root.getBoundingClientRect();
      const half = PREVIEW_W / 2 + 8;
      const left = Math.min(Math.max(r.left + r.width / 2 - box.left, half), Math.max(half, box.width - half));
      const below = r.top - box.top < 190;
      setPreview({ id, left, top: below ? r.bottom - box.top + 8 : r.top - box.top - 8, below });
    };
    const hide = (e: Event) => {
      const root = (e.target as HTMLElement | null)?.closest?.(`.${PIN_ROOT}`) as HTMLElement | null;
      if (!root) return;
      const to = (e as MouseEvent | FocusEvent).relatedTarget as Node | null;
      if (to && root.contains(to)) return;
      setPreview(null);
    };
    const clear = () => setPreview(null);
    el.addEventListener("mouseover", show);
    el.addEventListener("mouseout", hide);
    el.addEventListener("focusin", show);
    el.addEventListener("focusout", hide);
    map.on("movestart zoomstart", clear);
    return () => {
      el.removeEventListener("mouseover", show);
      el.removeEventListener("mouseout", hide);
      el.removeEventListener("focusin", show);
      el.removeEventListener("focusout", hide);
      map.off("movestart zoomstart", clear);
    };
  }, [map, ref]);

  // The map container is hidden on mobile while the list shows; Leaflet must re-measure when it comes back.
  useEffect(() => {
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [map, mobileView]);

  const focus = (p: MapPinDTO) => {
    setSelected(p.id);
    setMobileView("map");
    map?.setView([p.lat, p.lng], Math.max(map.getZoom(), 13));
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition((pos) => {
      map?.setView([pos.coords.latitude, pos.coords.longitude], 14);
    });

  const hovered = preview ? pinById.get(preview.id) : null;

  const list = (
    <ul className="divide-y divide-line" aria-label={t("map_list_label")}>
      {visible.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("map_no_pins")}</li>}
      {visible.slice(0, 100).map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => (map ? focus(p) : setSelected(p.id))}
            className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-raised", selected === p.id && "bg-brand-soft")}
          >
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.title} loading="lazy" className="h-12 w-12 shrink-0 rounded-[3px] border border-line bg-neutral-fill object-cover" />
            ) : (
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: pinColor(p) }} aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-semibold" data-ugc>
                {p.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {catName.get(p.categoryId)} · {areaName.get(p.upazilaId)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted">
              <ArrowBigUp className="h-4 w-4" aria-hidden="true" />
              {formatNumber(p.score, lang)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const viewToggle = (
    <div className="flex shrink-0 overflow-hidden rounded-[3px] border border-line md:hidden" role="group" aria-label={t("map_view_toggle")}>
      {(["map", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setMobileView(v)}
          aria-pressed={mobileView === v}
          className={cn("flex min-h-[36px] items-center gap-1.5 px-2.5 text-xs font-semibold", mobileView === v ? "bg-ink text-surface" : "bg-surface text-muted")}
        >
          {v === "map" ? <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <List className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="hidden min-[360px]:inline">{t(v === "map" ? "nav_map" : "map_list")}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[420px] flex-col md:h-[calc(100dvh-3.5rem)]">
      {/* Filters: two compact rows on phones, one row from tablets up */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="scroll-thin -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] md:flex-none" role="group" aria-label={t("filter_status")}>
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={group === g.key}
              onClick={() => setGroup(g.key)}
              className={cn(
                "min-h-[36px] shrink-0 rounded-[3px] border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 sm:text-[13px]",
                group === g.key ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink",
              )}
            >
              {t(g.key === "all" ? "filter_all" : g.key === "open" ? "filter_open" : g.key === "progress" ? "filter_progress" : "filter_resolved")}
            </button>
          ))}
        </div>
        {viewToggle}
        <div className="flex w-full gap-2 md:w-auto">
          <select className="input min-w-0 flex-1 rounded-[3px] !py-1.5 text-[16px] sm:text-sm md:!w-auto md:flex-none" value={area} onChange={(e) => setArea(e.target.value)} aria-label={t("filter_area")}>
            <option value="">{t("all_areas")}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select className="input min-w-0 flex-1 rounded-[3px] !py-1.5 text-[16px] sm:text-sm md:!w-auto md:flex-none" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("filter_category")}>
            <option value="">{t("all_categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <p className="ml-auto hidden text-xs text-muted md:block" aria-live="polite">
          {t("map_showing", { n: formatNumber(visible.length, lang) })}
        </p>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Map area */}
        {/* `isolate` keeps Leaflet's own z-indexes (400-1000) from painting over the header's menus. */}
        <div ref={shellRef} className={cn("relative isolate min-w-0 flex-1", mobileView === "list" && "hidden md:block")}>
          <div ref={ref} className="h-full w-full" role="application" aria-label={t("map_aria")} />
          {!map && <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-bg/60 text-sm text-muted">{t("map_loading")}</div>}

          <LayerSwitcher value={style} onChange={setStyle} className="right-3 top-3" />

          {map && (
            <button type="button" onClick={locate} className="btn-secondary btn-sm absolute top-16 right-3 z-[1000] !px-2.5 rounded-[3px] border border-line bg-surface shadow-sm active:scale-95" aria-label={t("use_my_location")}>
              <Locate className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}

          {/* Hover / focus preview */}
          {preview && hovered && (
            <div
              className="pointer-events-none absolute z-[1100] overflow-hidden rounded-[4px] border border-line bg-surface shadow-popover"
              style={{ width: PREVIEW_W, left: preview.left, top: preview.top, transform: preview.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
              role="tooltip"
            >
              {hovered.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hovered.imageUrl} alt={hovered.title} loading="lazy" className="aspect-[16/10] w-full bg-neutral-fill object-cover" />
              )}
              <div className="space-y-1.5 p-2.5">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug" data-ugc>
                  {hovered.title}
                </p>
                <div className="flex items-center justify-between">
                  <StatusChip status={hovered.status} />
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-muted">
                    <ArrowBigUp className="h-4 w-4" aria-hidden="true" />
                    {formatNumber(hovered.score, lang)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {current && (
            <div className="absolute bottom-3 left-3 right-3 z-[1050] animate-pop-in rounded-[4px] border border-line bg-surface p-3.5 shadow-popover sm:right-auto sm:w-[360px] sm:p-4" role="dialog" aria-label={current.title}>
              <button type="button" className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-[3px] text-muted hover:bg-raised" onClick={() => setSelected(null)} aria-label={t("close")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex gap-3 pr-7">
                {current.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-[3px] border border-line bg-neutral-fill object-cover" />
                )}
                <div className="min-w-0">
                  <StatusChip status={current.status} />
                  <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug" data-ugc>
                    {current.title}
                  </p>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {catName.get(current.categoryId)} · {areaName.get(current.upazilaId)}
                {!current.precise && ` · ${t("approximate")}`}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm font-semibold text-muted">
                  <ArrowBigUp className="h-5 w-5" aria-hidden="true" />
                  {formatNumber(current.score, lang)}
                </span>
                <Link href={`/issues/${current.id}`} className="btn-primary btn-sm rounded-[3px]">
                  {t("open_issue")}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Side list */}
        <aside className={cn("scroll-thin w-full shrink-0 overflow-y-auto overscroll-contain border-l border-line bg-surface md:block md:w-[340px]", mobileView === "map" ? "hidden" : "block")} aria-label={t("map_list_label")}>
          {list}
        </aside>
      </div>

      {/* Legend */}
      <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface px-4 py-2 text-xs text-muted">
        {[
          ["var(--status-new)", "legend_open"],
          ["var(--status-inprogress)", "legend_progress"],
          ["var(--status-done)", "legend_resolved"],
          [OVERDUE_VAR, "legend_overdue"],
        ].map(([c, k]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[1px]" style={{ background: c }} aria-hidden="true" />
            {t(k as "legend_open")}
          </span>
        ))}
        <span className="text-faint">· {t("legend_faded")}</span>
      </div>
    </div>
  );
}
