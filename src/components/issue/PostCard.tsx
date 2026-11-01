"use client";

import { Building2, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import type { FeedItem } from "@/server/queries/feed";
import { BookmarkButton } from "./BookmarkButton";
import { ImageGrid } from "./ImageGrid";
import { IssueAuthor } from "./IssueAuthor";
import { DueLabel, IssueBadges } from "./IssueBadges";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import { PostMenu } from "./PostMenu";
import { ShareMenu } from "./ShareMenu";
import { VoteBar } from "./VoteBar";

export function PostCard({ item, signedIn, detail = false, onRemoved }: { item: FeedItem; signedIn: boolean; detail?: boolean; onRemoved?: (id: string) => void }) {
  const { t, tn, lang } = useI18n();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [removed, setRemoved] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Show "See more" only when the clamped text actually overflows.
  useEffect(() => {
    if (detail) return;
    const el = textRef.current;
    if (!el) return;
    const checkOverflow = () => {
      if (!expanded) setCanExpand(el.scrollHeight > el.clientHeight + 1);
    };
    checkOverflow();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [item.body, detail, expanded]);

  if (removed) return null;

  const href = `/issues/${item.id}`;

  return (
    <article className={cn("overflow-hidden rounded-[4px] border border-line bg-surface shadow-none", item.mpPriority && "border-brand/50")} aria-labelledby={`t-${item.id}`}>
      {item.mpPriority && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-brand">
          <Star className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true" />
          <span>{t("mp_priority")}</span>
          {item.mpTargetDate && <span className="font-normal text-muted">· {t("target_date", { date: item.mpTargetDate })}</span>}
        </div>
      )}
      <div className="p-3 pb-2 sm:p-4 sm:pb-3">
        <header className="flex items-start gap-2">
          <IssueAuthor item={item} />
          <div className="-mr-1 flex shrink-0 items-center gap-1">
            <StatusChip status={item.status} className="text-[11px] sm:text-xs" />
            <PostMenu
              item={item}
              signedIn={signedIn}
              onWithdrawn={
                detail
                  ? undefined
                  : () => {
                      setRemoved(true);
                      onRemoved?.(item.id);
                    }
              }
            />
          </div>
        </header>

        <div className="mt-3">
          <IssueBadges item={item} />
        </div>

        {detail ? (
          <h1 id={`t-${item.id}`} className="mt-3 text-xl font-semibold leading-snug sm:text-2xl" data-ugc>
            {item.title}
          </h1>
        ) : (
          <h2 id={`t-${item.id}`} className="mt-3 text-base font-semibold leading-snug sm:text-[17px]">
            <Link href={href} className="hover:text-brand" data-ugc>
              {item.title}
            </Link>
          </h2>
        )}
        <p ref={textRef} className={cn("mt-1.5 whitespace-pre-line break-words text-[15px] text-ink/90", !detail && !expanded && "line-clamp-4")} data-ugc>
          {item.body}
        </p>
        {(canExpand || expanded) && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="link mt-1 inline-block cursor-pointer py-0.5 text-sm font-semibold focus:underline focus:outline-none">
            {expanded ? t("see_less") : t("see_more")}
          </button>
        )}
      </div>

      <ImageGrid ids={item.images} full={detail} alt={t("photo_of", { title: item.title })} onImageClick={(idx) => setLightboxIndex(idx)} />

      {item.stakeholder && item.labels.stakeholder && (
        <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2 text-[13px] sm:mx-4">
          <Building2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="text-muted">{t("assigned_to")}</span>
          <Link href={`/offices/${item.stakeholder.id}`} className="min-w-0 font-semibold hover:text-brand hover:underline">
            {item.labels.stakeholder}
          </Link>
          <DueLabel dueAt={item.dueAt} status={item.status} className="ml-auto" />
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between gap-1 border-t border-line px-2.5 py-1.5 sm:px-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <VoteBar
            size={detail ? "lg" : "md"}
            issueId={item.id}
            score={item.score}
            upvotes={item.upvotes}
            downvotes={item.downvotes}
            myVote={item.myVote}
            isMine={item.isMine}
            signedIn={signedIn}
          />
          <Link href={`${href}#comments`} className="btn-ghost btn-sm h-9 min-h-0 shrink-0 rounded-[3px] px-2 active:scale-95 sm:px-2.5" aria-label={tn("comments", item.commentCount)}>
            <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="text-xs">{formatNumber(item.commentCount, lang)}</span>
          </Link>
          <ShareMenu path={href} title={item.title} />
        </div>
        <div className="flex shrink-0 items-center">
          <BookmarkButton issueId={item.id} initialSaved={item.saved} signedIn={signedIn} />
        </div>
      </footer>

      {lightboxIndex !== null && <PhotoLightboxModal item={item} initialIndex={lightboxIndex} signedIn={signedIn} onClose={() => setLightboxIndex(null)} />}
    </article>
  );
}
