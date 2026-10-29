"use client";

import { AlertTriangle, Building2, Flame, MapPin, MessageCircle, Star, EyeOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { daysUntil } from "@/lib/format";
import type { FeedItem } from "@/server/queries/feed";
import { ImageGrid } from "./ImageGrid";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import { BookmarkButton } from "./BookmarkButton";
import { PostMenu } from "./PostMenu";
import { ShareMenu } from "./ShareMenu";
import { VoteBar } from "./VoteBar";

export function PostCard({ item, signedIn, detail = false }: { item: FeedItem; signedIn: boolean; detail?: boolean }) {
  const { t, tn, lang } = useI18n();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (detail) return;
    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!expanded) {
        setCanExpand(el.scrollHeight > el.clientHeight + 1);
      }
    };

    checkOverflow();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(checkOverflow);
      ro.observe(el);
    }

    return () => {
      ro?.disconnect();
    };
  }, [item.body, detail, expanded]);

  const href = `/issues/${item.id}`;
  const active = item.status === "assigned" || item.status === "in_progress";
  const days = item.dueAt ? daysUntil(item.dueAt) : null;

  const authorName = item.author.anonymous && !item.author.id ? t("anonymous_citizen") : item.author.name;

  return (
    <article className={cn("rounded-[4px] border border-line bg-surface shadow-none overflow-hidden", item.mpPriority && "border-brand/50")} aria-labelledby={`t-${item.id}`}>
      {item.mpPriority && (
        <div className="flex items-center gap-2 bg-brand-soft px-4 py-2 text-xs font-semibold text-brand">
          <Star className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          {t("mp_priority")}
          {item.mpTargetDate && <span className="font-normal text-muted">· {t("target_date", { date: item.mpTargetDate })}</span>}
        </div>
      )}
      <div className="p-3 sm:p-4 pb-2 sm:pb-3">
        <header className="flex items-start gap-3">
          {item.author.id ? (
            <Link href={`/u/${item.author.id}`} aria-label={authorName}>
              <Avatar name={item.author.name} mediaId={item.author.avatarMediaId} />
            </Link>
          ) : (
            <Avatar name="" anonymous />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {item.author.id ? (
                <Link href={`/u/${item.author.id}`} className="hover:underline">
                  {authorName}
                </Link>
              ) : (
                authorName
              )}
              {item.author.anonymous && item.author.id && <span className="ml-1.5 text-xs font-normal text-faint">({t("anonymous_staff_view")})</span>}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
              <TimeAgo date={item.createdAt} />
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {item.labels.area}
                {!item.precise && <span className="text-faint">({t("approximate")})</span>}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusChip status={item.status} />
            <PostMenu item={item} signedIn={signedIn} />
          </div>
        </header>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-[3px] border border-line px-2 py-0.5 text-xs font-normal text-muted">
            {item.labels.category}
          </span>
          {item.isUrgent && (
            <span className="rounded-[3px] border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs font-normal text-danger">
              <Flame className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {t("urgent")}
            </span>
          )}
          {item.overdue && (
            <span className="rounded-[3px] border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs font-normal text-danger">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {t("overdue")}
            </span>
          )}
          {item.hidden && (
            <span className="rounded-[3px] border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs font-normal text-warn">
              <EyeOff className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {t("hidden_by_moderators")}
            </span>
          )}
        </div>

        {detail ? (
          <h1 id={`t-${item.id}`} className="mt-3 text-xl font-semibold leading-snug sm:text-2xl" data-ugc>
            {item.title}
          </h1>
        ) : (
          <h2 id={`t-${item.id}`} className="mt-3 text-[17px] font-semibold leading-snug">
            <Link href={href} className="hover:text-brand" data-ugc>
              {item.title}
            </Link>
          </h2>
        )}
        <p
          ref={textRef}
          className={cn("mt-1.5 whitespace-pre-line text-[15px] text-ink/90", !detail && !expanded && "line-clamp-4")}
          data-ugc
        >
          {item.body}
        </p>
        {(canExpand || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="link mt-1 inline-block text-sm font-semibold cursor-pointer focus:outline-none focus:underline"
          >
            {expanded ? t("see_less") : t("see_more")}
          </button>
        )}
      </div>

      <ImageGrid
        ids={item.images}
        full={detail}
        alt={t("photo_of", { title: item.title })}
        onImageClick={(idx) => setLightboxIndex(idx)}
      />

      {item.labels.stakeholder && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2 text-[13px]">
          <Building2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="text-muted">{t("assigned_to")}</span>
          <span className="font-semibold">{item.labels.stakeholder}</span>
          {active && days !== null && (
            <span className={cn("ml-auto text-xs font-semibold", days < 0 ? "text-danger" : "text-muted")}>
              {days < 0 ? t("overdue_by_days", { n: formatNumber(-days, lang) }) : days === 0 ? t("due_today") : t("due_in_days", { n: formatNumber(days, lang) })}
            </span>
          )}
        </div>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-line px-2 sm:px-3 py-2">
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
        <Link href={`${href}#comments`} className="btn-ghost btn-sm rounded-[3px] ml-1" aria-label={tn("comments", item.commentCount)}>
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>{formatNumber(item.commentCount, lang)}</span>
        </Link>
        <ShareMenu path={href} title={item.title} />
        <span className="ml-auto">
          <BookmarkButton issueId={item.id} initialSaved={item.saved} signedIn={signedIn} />
        </span>
      </footer>

      {lightboxIndex !== null && (
        <PhotoLightboxModal
          item={item}
          initialIndex={lightboxIndex}
          signedIn={signedIn}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </article>
  );
}
