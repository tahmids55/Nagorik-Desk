"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import type { Sort } from "@/lib/constants";
import { loadMoreIssues } from "@/server/actions/feed";
import type { FeedItem } from "@/server/queries/feed";
import { PostCard } from "./PostCard";

export type FeedQuery = {
  q?: string;
  area?: string;
  category?: string;
  status?: "open" | "progress" | "resolved" | "rejected" | "overdue";
  urgent?: boolean;
  sort?: Sort;
  near?: { lat: number; lng: number };
  authorId?: string;
  votedBy?: string;
  stakeholderId?: string;
};

/** Server-rendered first page; further pages load as the reader nears the end (or with the button). */
export function Feed({ initial, hasMore: initialHasMore, query, signedIn }: { initial: FeedItem[]; hasMore: boolean; query: FeedQuery; signedIn: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const more = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      setFailed(false);
      try {
        const res = await loadMoreIssues({ ...query, page: page + 1 });
        setItems((cur) => {
          const seen = new Set(cur.map((i) => i.id));
          return [...cur, ...res.items.filter((i) => !seen.has(i.id))];
        });
        setHasMore(res.hasMore);
        setPage((p) => p + 1);
      } catch {
        setFailed(true);
      } finally {
        busy.current = false;
      }
    });
  }, [page, query]);

  // Infinite scroll: start loading a screen before the end. A failed load waits for the button.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && more(), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, failed, more]);

  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-3 sm:space-y-4">
      {items.map((item) => (
        <PostCard key={item.id} item={item} signedIn={signedIn} onRemoved={remove} />
      ))}
      <div ref={sentinel} aria-hidden="true" />
      {hasMore ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <button type="button" onClick={more} disabled={pending} className="btn-secondary rounded-[3px] font-medium">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {pending ? t("loading_more") : t("show_more")}
          </button>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {t("err_generic")}
            </p>
          )}
        </div>
      ) : (
        items.length > 3 && <p className="py-3 text-center text-xs text-faint">{t("end_of_feed")}</p>
      )}
    </div>
  );
}
