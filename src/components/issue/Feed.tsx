"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import type { Sort } from "@/lib/constants";
import { loadMoreIssues } from "@/server/actions/feed";
import type { FeedItem } from "@/server/queries/feed";
import { PostCard } from "./PostCard";

type Query = { q?: string; area?: string; category?: string; status?: "open" | "progress" | "resolved" | "rejected" | "overdue"; urgent?: boolean; sort?: Sort; authorId?: string; votedBy?: string };

/** Server-rendered first page, then "Show more" appends further pages. */
export function Feed({ initial, hasMore: initialHasMore, query, signedIn }: { initial: FeedItem[]; hasMore: boolean; query: Query; signedIn: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const more = () =>
    start(async () => {
      setFailed(false);
      try {
        const res = await loadMoreIssues({ ...query, page: page + 1 });
        const seen = new Set(items.map((i) => i.id));
        setItems([...items, ...res.items.filter((i) => !seen.has(i.id))]);
        setHasMore(res.hasMore);
        setPage(page + 1);
      } catch {
        setFailed(true);
      }
    });

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <PostCard key={item.id} item={item} signedIn={signedIn} />
      ))}
      {hasMore && (
        <div className="flex flex-col items-center gap-2 py-2">
          <button type="button" onClick={more} disabled={pending} className="btn-secondary rounded-[3px] font-medium">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t("show_more")}
          </button>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {t("err_generic")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
