"use client";

import { Flame, Home, Loader2, LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useI18n } from "@/i18n/client";
import { formatNumber, type TKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { formatNear, parseNear } from "@/lib/issue";

export type Option = { value: string; label: string };

const STATUS: { value: string; key: TKey }[] = [
  { value: "", key: "filter_all" },
  { value: "open", key: "filter_open" },
  { value: "progress", key: "filter_progress" },
  { value: "resolved", key: "filter_resolved" },
  { value: "overdue", key: "filter_overdue" },
];

const SORTS: { value: string; key: TKey }[] = [
  { value: "hot", key: "sort_hot" },
  { value: "top", key: "sort_top" },
  { value: "new", key: "sort_new" },
  { value: "near", key: "sort_near" },
];

type NearState = "idle" | "locating" | "failed" | "outside";

const chipBase = "inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-[3px] border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 sm:text-[13px]";
const chipOff = "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink";
const chipOn = "border-ink bg-ink text-surface";

/** Filters live in the URL, so every view is shareable and the back button works. */
export function FilterBar({ areas, categories, myArea }: { areas: Option[]; categories: Option[]; myArea?: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [near, setNear] = useState<NearState>("idle");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const status = params.get("status") ?? "";
  const urgent = params.get("urgent") === "1";
  const area = params.get("area") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") === "near" && params.get("near") ? "near" : (params.get("sort") ?? "hot");
  const sheetCount = [area, category, sort !== "hot" ? sort : ""].filter(Boolean).length;

  const locate = () => {
    if (!navigator.geolocation) return setNear("failed");
    setNear("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = parseNear(`${pos.coords.latitude},${pos.coords.longitude}`);
        if (!p) return setNear("outside");
        setNear("idle");
        set({ sort: "near", near: formatNear(p) });
      },
      () => setNear("failed"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const setSort = (v: string) => {
    if (v === "near") return locate();
    setNear("idle");
    set({ sort: v === "hot" ? "" : v, near: "" });
  };

  const nearMessage = near === "locating" ? t("near_locating") : near === "failed" ? t("near_failed") : near === "outside" ? t("near_outside") : null;

  const areaSelect = (
    <select className="input rounded-[3px] !py-2 text-[16px] sm:text-sm" value={area} onChange={(e) => set({ area: e.target.value })} aria-label={t("filter_area")}>
      <option value="">{t("all_areas")}</option>
      {areas.map((a) => (
        <option key={a.value} value={a.value}>
          {a.label}
        </option>
      ))}
    </select>
  );
  const categorySelect = (
    <select className="input rounded-[3px] !py-2 text-[16px] sm:text-sm" value={category} onChange={(e) => set({ category: e.target.value })} aria-label={t("filter_category")}>
      <option value="">{t("all_categories")}</option>
      {categories.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2.5 rounded-[4px] border border-line bg-surface p-2.5 shadow-none sm:space-y-3 sm:p-3">
      <div className="flex gap-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() });
          }}
          className="relative min-w-0 flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
            className="input rounded-[3px] !pl-10 !pr-9 text-[16px] sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            placeholder={t("search_placeholder")}
            aria-label={t("search_placeholder")}
          />
          {pending ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-label={t("loading")} />
          ) : (
            q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  if (params.get("q")) set({ q: "" });
                }}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[3px] text-muted hover:bg-neutral-fill hover:text-ink"
                aria-label={t("clear_filters")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          )}
        </form>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn("btn-secondary relative !min-h-[44px] shrink-0 rounded-[3px] !px-3 sm:hidden", sheetCount > 0 && "border-ink")}
          aria-label={sheetCount > 0 ? `${t("filters")} (${formatNumber(sheetCount, lang)})` : t("filters")}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          {sheetCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[2px] bg-brand px-1 text-[10px] font-medium text-[var(--btn-primary-text)]" aria-hidden="true">
              {formatNumber(sheetCount, lang)}
            </span>
          )}
        </button>
      </div>

      <div className="scroll-thin -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] sm:[scrollbar-width:auto]" role="group" aria-label={t("filter_status")}>
        <button
          type="button"
          onClick={() => set({ urgent: urgent ? "" : "1" })}
          aria-pressed={urgent}
          className={cn(chipBase, urgent ? "border-danger bg-danger text-surface" : "border-danger/40 bg-surface text-danger hover:bg-danger/10")}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {t("filter_urgent")}
        </button>
        {myArea && (
          <button type="button" onClick={() => set({ area: area === myArea ? "" : myArea })} aria-pressed={area === myArea} className={cn(chipBase, area === myArea ? chipOn : chipOff)}>
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            {t("filter_my_area")}
          </button>
        )}
        {STATUS.map((s) => (
          <button key={s.value} type="button" onClick={() => set({ status: s.value })} aria-pressed={status === s.value} className={cn(chipBase, status === s.value ? chipOn : chipOff)}>
            {t(s.key)}
          </button>
        ))}
      </div>

      <div className="hidden gap-2 sm:grid sm:grid-cols-3">
        {areaSelect}
        {categorySelect}
        <select className="input rounded-[3px] !py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("sort_by")}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </div>

      {nearMessage && !sheetOpen && (
        <p role={near === "locating" ? "status" : "alert"} className={cn("flex items-center gap-1.5 text-xs", near === "locating" ? "text-muted" : "text-danger")}>
          {near === "locating" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {nearMessage}
        </p>
      )}

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("filters_title")}>
        <div className="space-y-4 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
          <div>
            <span className="label">{t("filter_area")}</span>
            {areaSelect}
          </div>
          <div>
            <span className="label">{t("filter_category")}</span>
            {categorySelect}
          </div>
          <fieldset>
            <legend className="label">{t("sort_by")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSort(s.value)}
                  aria-pressed={sort === s.value}
                  className={cn("flex min-h-[44px] items-center justify-center gap-1.5 rounded-[3px] border px-3 text-sm font-medium transition-colors", sort === s.value ? chipOn : chipOff)}
                >
                  {s.value === "near" && (near === "locating" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />)}
                  {t(s.key)}
                </button>
              ))}
            </div>
            {nearMessage && near !== "locating" && (
              <p role="alert" className="field-error">
                {nearMessage}
              </p>
            )}
          </fieldset>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary flex-1 rounded-[3px]"
              disabled={sheetCount === 0}
              onClick={() => {
                setNear("idle");
                set({ area: "", category: "", sort: "", near: "" });
              }}
            >
              {t("clear_all")}
            </button>
            <button type="button" className="btn-primary flex-1 rounded-[3px]" onClick={() => setSheetOpen(false)}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("show_results")}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
