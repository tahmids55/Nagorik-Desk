"use client";

import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Trash2,
  X,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/constants";
import { daysUntil } from "@/lib/format";
import type { CommentDTO } from "@/lib/types";
import { addComment, deleteOwnComment, fetchIssueComments } from "@/server/actions/issues";
import type { FeedItem } from "@/server/queries/feed";
import { FlagButton } from "./FlagButton";
import { PostMenu } from "./PostMenu";
import { VoteBar } from "./VoteBar";

export function PhotoLightboxModal({
  item,
  initialIndex = 0,
  signedIn,
  onClose,
}: {
  item: FeedItem;
  initialIndex?: number;
  signedIn: boolean;
  onClose: () => void;
}) {
  const { t, tn, lang } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, (item.images.length || 1) - 1))
  );
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const totalImages = item.images.length;
  const activeImageId = item.images[currentIndex];
  const touchStartXRef = useRef<number | null>(null);

  const prevImage = useCallback(() => {
    if (totalImages <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
  }, [totalImages]);

  const nextImage = useCallback(() => {
    if (totalImages <= 1) return;
    setCurrentIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
  }, [totalImages]);

  // Lock body scroll and set up keyboard navigation
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nextImage, onClose, prevImage]);

  // Load comments for this issue
  useEffect(() => {
    let active = true;
    setLoadingComments(true);
    fetchIssueComments(item.id)
      .then((data) => {
        if (active) setComments(data);
      })
      .catch(() => {
        if (active) setComments([]);
      })
      .finally(() => {
        if (active) setLoadingComments(false);
      });

    return () => {
      active = false;
    };
  }, [item.id]);

  const handleShare = async () => {
    const url = `${window.location.origin}/issues/${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);

    const fd = new FormData();
    fd.append("issueId", item.id);
    fd.append("body", text);

    try {
      const res = await addComment(null, fd);
      if (res && !res.ok && "error" in res) {
        setCommentError(String(res.error));
      } else {
        setCommentText("");
        const refreshed = await fetchIssueComments(item.id);
        setComments(refreshed);
      }
    } catch {
      setCommentError("failed_to_post");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!window.confirm(t("confirm_delete_comment"))) return;
    startTransition(async () => {
      await deleteOwnComment(commentId);
      const refreshed = await fetchIssueComments(item.id);
      setComments(refreshed);
    });
  };

  // Touch swipe support for photo slider
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff > 45) {
      prevImage();
    } else if (diff < -45) {
      nextImage();
    }
    touchStartXRef.current = null;
  };

  const authorName = item.author.anonymous && !item.author.id ? t("anonymous_citizen") : item.author.name;
  const activeStakeholder = item.status === "assigned" || item.status === "in_progress";
  const days = item.dueAt ? daysUntil(item.dueAt) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-3 lg:p-6"
    >
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Container: Split left photo slider + right post/comments */}
      <div
        className="relative z-10 flex h-full w-full max-w-[1360px] flex-col overflow-hidden rounded-none md:rounded-[4px] border-0 md:border md:border-line bg-surface shadow-2xl lg:h-[92vh] lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ───────────── LEFT SIDE: Photo Viewer & Slider ───────────── */}
        <section
          className="relative flex flex-1 flex-col items-center justify-center bg-[#07090F] min-h-[300px] max-h-[50vh] lg:max-h-full select-none overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={t("photo_of", { title: item.title })}
        >
          {/* Top Bar on Photo Stage */}
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/75 to-transparent text-white">
            <div className="flex items-center gap-2">
              {totalImages > 1 && (
                <span className="rounded-[3px] bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/90 border border-white/10 backdrop-blur-sm">
                  {formatNumber(currentIndex + 1, lang)} / {formatNumber(totalImages, lang)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-black/60 text-white/90 hover:bg-black/90 hover:text-white border border-white/15 backdrop-blur-sm transition-colors"
              aria-label={t("close")}
              title={t("close")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Active Image */}
          <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
            {activeImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activeImageId}
                src={`/api/media/${activeImageId}`}
                alt={t("photo_of", { title: item.title })}
                className="max-h-[46vh] lg:max-h-[82vh] max-w-full object-contain transition-opacity duration-150"
              />
            ) : (
              <div className="text-sm text-neutral-400">{t("no_image")}</div>
            )}
          </div>

          {/* Slider Prev / Next Controls */}
          {totalImages > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-[3px] bg-black/60 text-white/90 hover:bg-black/90 hover:text-white border border-white/15 backdrop-blur-sm transition-all shadow-md focus:outline-none"
                aria-label={t("previous")}
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-[3px] bg-black/60 text-white/90 hover:bg-black/90 hover:text-white border border-white/15 backdrop-blur-sm transition-all shadow-md focus:outline-none"
                aria-label={t("next")}
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>

              {/* Bottom Thumbnail Strip */}
              <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5 px-3">
                {item.images.map((id, idx) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "relative h-11 w-11 overflow-hidden rounded-[2px] border transition-all",
                      idx === currentIndex
                        ? "border-brand ring-2 ring-brand ring-offset-1 ring-offset-black scale-105 opacity-100"
                        : "border-white/30 opacity-60 hover:opacity-100"
                    )}
                    aria-label={`${t("photo_of", { title: item.title })} ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${id}?s=thumb`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ───────────── RIGHT SIDE: Post Details & Comments ───────────── */}
        <section
          className="flex w-full flex-col lg:w-[460px] xl:w-[500px] shrink-0 bg-surface border-t lg:border-t-0 lg:border-l border-line min-h-0 flex-1 lg:flex-initial"
          aria-label={t("post_details")}
        >
          {/* Scrollable Container for Post Content & Comments Thread */}
          <div className="flex-1 overflow-y-auto scroll-thin p-4 sm:p-5 space-y-4">
            {/* Header: Author, Date, Status */}
            <header className="flex items-start gap-3">
              {item.author.id ? (
                <Link href={`/u/${item.author.id}`} aria-label={authorName}>
                  <Avatar name={item.author.name} mediaId={item.author.avatarMediaId} />
                </Link>
              ) : (
                <Avatar name="" anonymous />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-ink">
                  {item.author.id ? (
                    <Link href={`/u/${item.author.id}`} className="hover:underline">
                      {authorName}
                    </Link>
                  ) : (
                    authorName
                  )}
                  {item.author.anonymous && item.author.id && (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      ({t("anonymous_staff_view")})
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                  <TimeAgo date={item.createdAt} />
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {item.labels.area}
                    {!item.precise && <span className="text-muted">({t("approximate")})</span>}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <StatusChip status={item.status} />
                <PostMenu item={item} signedIn={signedIn} />
              </div>
            </header>

            {/* Badges / Tags */}
            <div className="flex flex-wrap gap-1.5">
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
              {item.mpPriority && (
                <span className="rounded-[3px] border border-brand/40 bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                  <Star className="inline h-3.5 w-3.5 mr-1" fill="currentColor" aria-hidden="true" />
                  {t("mp_priority")}
                </span>
              )}
              {item.hidden && (
                <span className="rounded-[3px] border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs font-normal text-warn">
                  <EyeOff className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  {t("hidden_by_moderators")}
                </span>
              )}
            </div>

            {/* Title & Body */}
            <div>
              <h2 className="text-lg font-semibold leading-snug text-ink" data-ugc>
                <Link href={`/issues/${item.id}`} className="hover:text-brand">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink/90" data-ugc>
                {item.body}
              </p>
            </div>

            {/* Assigned Stakeholder */}
            {item.labels.stakeholder && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border border-line bg-neutral-fill/30 p-2.5 text-[13px]">
                <Building2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="text-muted">{t("assigned_to")}</span>
                <span className="font-semibold text-ink">{item.labels.stakeholder}</span>
                {activeStakeholder && days !== null && (
                  <span className={cn("ml-auto text-xs font-semibold", days < 0 ? "text-danger" : "text-muted")}>
                    {days < 0
                      ? t("overdue_by_days", { n: formatNumber(-days, lang) })
                      : days === 0
                      ? t("due_today")
                      : t("due_in_days", { n: formatNumber(days, lang) })}
                  </span>
                )}
              </div>
            )}

            {/* Action Bar: Vote & Share */}
            <div className="flex items-center gap-2 border-y border-line py-2">
              <VoteBar
                size="md"
                issueId={item.id}
                score={item.score}
                upvotes={item.upvotes}
                downvotes={item.downvotes}
                myVote={item.myVote}
                isMine={item.isMine}
                signedIn={signedIn}
              />
              <div className="ml-1 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>{formatNumber(comments.length, lang)}</span>
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="btn-ghost btn-sm rounded-[3px] ml-auto"
                aria-label={t("share")}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span>{copied ? t("link_copied") : t("share")}</span>
              </button>
            </div>

            {/* ───────────── Comments Section (Below Post) ───────────── */}
            <section className="space-y-3 pt-1" aria-labelledby="modal-comments-heading">
              <h3 id="modal-comments-heading" className="text-sm font-semibold text-ink">
                {tn("comments", comments.length)}
              </h3>

              {/* Add Comment Form */}
              {signedIn ? (
                <form onSubmit={handlePostComment} className="space-y-2">
                  <textarea
                    rows={2}
                    required
                    maxLength={LIMITS.commentMax}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("comment_placeholder")}
                    className="input rounded-[3px] text-sm resize-y"
                    disabled={submittingComment}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {commentText.length}/{LIMITS.commentMax}
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment || commentText.trim().length === 0}
                      className="btn btn-primary btn-sm rounded-[3px]"
                    >
                      {submittingComment ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          <span>{t("posting")}</span>
                        </>
                      ) : (
                        t("post_comment")
                      )}
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-xs text-danger" role="alert">
                      {commentError === "failed_to_post" ? t("failed_to_post") : commentError}
                    </p>
                  )}
                </form>
              ) : (
                <p className="rounded-[3px] border border-line bg-neutral-fill/20 px-3 py-2.5 text-xs text-muted">
                  <Link
                    href={`/login?next=${encodeURIComponent(`/issues/${item.id}`)}`}
                    className="link font-semibold"
                  >
                    {t("sign_in")}
                  </Link>{" "}
                  {t("to_comment")}
                </p>
              )}

              {/* Comment List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-6 text-muted">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">{t("no_comments")}</p>
              ) : (
                <ul className="space-y-3 divide-y divide-line/60">
                  {comments.map((c) => (
                    <li key={c.id} className="pt-3 first:pt-0 flex gap-2.5">
                      <Link href={`/u/${c.author.id}`} aria-label={c.author.name}>
                        <Avatar name={c.author.name} mediaId={c.author.avatarMediaId} size="sm" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-ink">
                          <Link href={`/u/${c.author.id}`} className="hover:underline">
                            {c.author.name || t("deleted_user")}
                          </Link>
                          {c.author.role !== "citizen" && (
                            <span className="rounded-[2px] border border-brand/40 px-1 py-0.2 text-[10px] font-medium text-brand uppercase">
                              {c.author.role}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-line text-[13.5px] leading-snug text-ink/90" data-ugc>
                          {c.body}
                        </p>
                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
                          <TimeAgo date={c.createdAt} />
                          {c.mine ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className="inline-flex items-center gap-1 hover:text-danger text-muted transition-colors"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              {t("delete")}
                            </button>
                          ) : (
                            <FlagButton compact targetType="comment" targetId={c.id} signedIn={signedIn} />
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
