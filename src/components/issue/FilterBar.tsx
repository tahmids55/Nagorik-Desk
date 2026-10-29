"use client";

import { Flame, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import type { TKey } from "@/i18n/translate";

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
];

/** Filters live in the URL, so every view is shareable and the back button works. */
export function FilterBar({ areas, categories }: { areas: Option[]; categories: Option[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "hot";
  const urgent = params.get("urgent") === "1";

  return (
    <div className="rounded-[4px] border border-line bg-surface shadow-none space-y-3 p-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: q.trim() });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
          className="input rounded-[3px] !pl-10"
          placeholder={t("search_placeholder")}
          aria-label={t("search_placeholder")}
        />
      </form>

      <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label={t("filter_status")}>
        <button
          type="button"
          onClick={() => set({ urgent: urgent ? "" : "1" })}
          aria-pressed={urgent}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-3 py-1.5 text-[13px] font-medium transition-colors",
            urgent ? "border-danger bg-danger text-surface" : "border-danger/40 bg-surface text-danger hover:bg-danger/10"
          )}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {t("filter_urgent")}
        </button>
        {STATUS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => set({ status: s.value })}
            aria-pressed={status === s.value}
            className={cn(
              "shrink-0 rounded-[3px] border px-3 py-1.5 text-[13px] font-medium transition-colors",
              status === s.value
                ? "border-ink bg-ink text-surface"
                : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
            )}
          >
            {t(s.key)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select className="input rounded-[3px] !py-2 text-sm" value={params.get("area") ?? ""} onChange={(e) => set({ area: e.target.value })} aria-label={t("filter_area")}>
          <option value="">{t("all_areas")}</option>
          {areas.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <select className="input rounded-[3px] !py-2 text-sm" value={params.get("category") ?? ""} onChange={(e) => set({ category: e.target.value })} aria-label={t("filter_category")}>
          <option value="">{t("all_categories")}</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="input rounded-[3px] col-span-2 !py-2 text-sm sm:col-span-1" value={sort} onChange={(e) => set({ sort: e.target.value === "hot" ? "" : e.target.value })} aria-label={t("sort_by")}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
