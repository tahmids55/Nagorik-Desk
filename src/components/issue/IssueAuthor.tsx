"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useI18n } from "@/i18n/client";
import type { FeedItem } from "@/server/queries/feed";

/** Avatar, author name, time and place: the left half of every post header. */
export function IssueAuthor({ item }: { item: FeedItem }) {
  const { t } = useI18n();
  const anonymousPublic = item.author.anonymous && !item.author.id;
  const name = anonymousPublic ? t("anonymous_citizen") : item.author.name || t("deleted_user");

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
      {item.author.id ? (
        <Link href={`/u/${item.author.id}`} aria-label={name} className="shrink-0">
          <Avatar name={item.author.name} mediaId={item.author.avatarMediaId} size="sm" className="sm:h-10 sm:w-10" />
        </Link>
      ) : (
        <Avatar name="" anonymous size="sm" className="shrink-0 sm:h-10 sm:w-10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight sm:text-[15px]">
          {item.author.id ? (
            <Link href={`/u/${item.author.id}`} className="hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          {item.author.anonymous && item.author.id && <span className="ml-1.5 text-xs font-normal text-faint">({t("anonymous_staff_view")})</span>}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-xs text-muted">
          <TimeAgo date={item.createdAt} className="shrink-0" />
          <span aria-hidden="true">·</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.labels.area}</span>
            {!item.precise && <span className="hidden shrink-0 text-faint sm:inline">({t("approximate")})</span>}
          </span>
        </p>
      </div>
    </div>
  );
}
