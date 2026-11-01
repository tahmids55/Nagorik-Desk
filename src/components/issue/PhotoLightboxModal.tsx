"use client";

import { Building2, ChevronLeft, ChevronRight, Loader2, MessageCircle, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useErrorText } from "@/components/ui/forms";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/constants";
import type { CommentDTO } from "@/lib/types";
import { addComment, deleteOwnComment, fetchIssueComments } from "@/server/actions/issues";
import type { FeedItem } from "@/server/queries/feed";
import { FlagButton } from "./FlagButton";
import { IssueAuthor } from "./IssueAuthor";
import { DueLabel, IssueBadges } from "./IssueBadges";
import { PostMenu } from "./PostMenu";
import { ShareMenu } from "./ShareMenu";
import { VoteBar } from "./VoteBar";

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Full-screen photo viewer with the post and its comments alongside (below the photo on phones). */
export function PhotoLightboxModal({ item, initialIndex = 0, signedIn, onClose }: { item: FeedItem; initialIndex?: number; signedIn: boolean; onClose: () => void }) {
  const { t, tn, lang } = useI18n();
  const errorText = useErrorText();
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, Math.min(initialIndex, (item.images.length || 1) - 1)));
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const totalImages = item.images.length;
  const activeImageId = item.images[currentIndex];

  useScrollLock(true);

  const prevImage = useCallback(() => {
    if (totalImages > 1) setCurrentIndex((i) => (i > 0 ? i - 1 : totalImages - 1));
  }, [totalImages]);
  const nextImage = useCallback(() => {
    if (totalImages > 1) setCurrentIndex((i) => (i < totalImages - 1 ? i + 1 : 0));
  }, [totalImages]);

  // Focus moves into the viewer and returns to the photo that opened it.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, []);

  // Keyboard: Escape closes, arrows switch photos (but not while typing, or inside a dialog opened on top).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e.target)) return;
      const target = e.target as Node | null;
      if (target && target !== document.body && !rootRef.current?.contains(target)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextImage, onClose, prevImage]);

  const reloadComments = useCallback(async () => {
    try {
      setComments(await fetchIssueComments(item.id));
    } catch {
      /* keep the list we have */
    }
  }, [item.id]);

  useEffect(() => {
    let active = true;
    setLoadingComments(true);
    fetchIssueComments(item.id)
      .then((data) => active && setComments(data))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoadingComments(false));
    return () => {
      active = false;
    };
  }, [item.id]);

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
      if (res && !res.ok) {
        setCommentError(errorText(res.fields?.body ?? res.code, res.retryAfterSec));
      } else {
        setCommentText("");
        await reloadComments();
      }
    } catch {
      setCommentError(t("failed_to_post"));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!window.confirm(t("confirm_delete_comment"))) return;
    startTransition(async () => {
      await deleteOwnComment(commentId);
      await reloadComments();
    });
  };

  // Swipe between photos; vertical movement (scrolling) is ignored.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0]!.clientX - start.x;
    const dy = e.changedTouches[0]!.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) (dx > 0 ? prevImage : nextImage)();
  };

  const navButton = "absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[3px] border border-white/15 bg-black/60 text-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-black/90 hover:text-white sm:flex";

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/90 p-0 backdrop-blur-sm md:p-3 lg:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 flex h-full w-full max-w-[1360px] flex-col overflow-hidden rounded-none border-0 bg-surface shadow-2xl md:rounded-[4px] md:border md:border-line lg:h-[92vh] lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ───────────── Photo stage ───────────── */}
        <section
          className="relative flex h-[30vh] max-h-[36vh] min-h-[180px] select-none flex-col items-center justify-center overflow-hidden bg-[#07090F] pt-[env(safe-area-inset-top)] lg:h-auto lg:max-h-full lg:min-h-0 lg:flex-1 lg:pt-0"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={t("photo_of", { title: item.title })}
          aria-roledescription="carousel"
        >
          <div className="absolute left-0 right-0 top-[env(safe-area-inset-top)] z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-3 text-white lg:top-0">
            <div className="flex items-center gap-2">
              {totalImages > 1 && (
                <span className="rounded-[3px] border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/90 backdrop-blur-sm" aria-live="polite">
                  {formatNumber(currentIndex + 1, lang)} / {formatNumber(totalImages, lang)}
                </span>
              )}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-white/15 bg-black/60 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/90 hover:text-white active:scale-95"
              aria-label={t("close")}
              title={t("close")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
            {activeImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activeImageId}
                src={`/api/media/${activeImageId}`}
                alt={t("photo_n_of", { n: formatNumber(currentIndex + 1, lang), total: formatNumber(Math.max(totalImages, 1), lang) })}
                className="max-h-[28vh] max-w-full animate-fade-in object-contain lg:max-h-[82vh]"
              />
            ) : (
              <div className="text-sm text-neutral-400">{t("no_image")}</div>
            )}
          </div>

          {totalImages > 1 && (
            <>
              <button type="button" onClick={prevImage} className={cn(navButton, "left-3")} aria-label={t("previous")}>
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button type="button" onClick={nextImage} className={cn(navButton, "right-3")} aria-label={t("next")}>
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>

              {/* Phones: position dots (swipe to move). Larger screens: thumbnails. */}
              <div className="absolute bottom-2.5 left-0 right-0 z-20 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
                {item.images.map((id, idx) => (
                  <span key={id} className={cn("h-1.5 rounded-[1px] transition-all", idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/45")} />
                ))}
              </div>
              <div className="absolute bottom-3 left-0 right-0 z-20 hidden justify-center gap-1.5 px-3 sm:flex">
                {item.images.map((id, idx) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-current={idx === currentIndex}
                    className={cn(
                      "relative h-11 w-11 overflow-hidden rounded-[2px] border transition-all",
                      idx === currentIndex ? "scale-105 border-brand opacity-100 ring-2 ring-brand ring-offset-1 ring-offset-black" : "border-white/30 opacity-60 hover:opacity-100",
                    )}
                    aria-label={t("photo_n_of", { n: formatNumber(idx + 1, lang), total: formatNumber(totalImages, lang) })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/media/${id}?s=thumb`} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ───────────── Post details & comments ───────────── */}
        <section className="flex min-h-0 w-full flex-1 shrink-0 flex-col border-t border-line bg-surface lg:w-[460px] lg:flex-initial lg:border-l lg:border-t-0 xl:w-[500px]" aria-label={t("post_details")}>
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto overscroll-contain p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:p-5">
            <header className="flex items-start gap-2">
              <IssueAuthor item={item} />
              <div className="flex shrink-0 items-center gap-1">
                <StatusChip status={item.status} />
                <PostMenu item={item} signedIn={signedIn} />
              </div>
            </header>

            <IssueBadges item={item} showPriority />

            <div>
              <h2 className="text-lg font-semibold leading-snug text-ink" data-ugc>
                <Link href={`/issues/${item.id}`} className="hover:text-brand">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-ink/90" data-ugc>
                {item.body}
              </p>
            </div>

            {item.stakeholder && item.labels.stakeholder && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border border-line bg-neutral-fill/30 p-2.5 text-[13px]">
                <Building2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="text-muted">{t("assigned_to")}</span>
                <Link href={`/offices/${item.stakeholder.id}`} className="font-semibold text-ink hover:text-brand hover:underline">
                  {item.labels.stakeholder}
                </Link>
                <DueLabel dueAt={item.dueAt} status={item.status} className="ml-auto" />
              </div>
            )}

            <div className="flex items-center gap-2 border-y border-line py-2">
              <VoteBar size="md" issueId={item.id} score={item.score} upvotes={item.upvotes} downvotes={item.downvotes} myVote={item.myVote} isMine={item.isMine} signedIn={signedIn} />
              <span className="ml-1 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted" aria-label={tn("comments", comments.length)}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {formatNumber(comments.length, lang)}
              </span>
              <ShareMenu path={`/issues/${item.id}`} title={item.title} className="ml-auto" />
            </div>

            <section className="space-y-3 pt-1" aria-labelledby="modal-comments-heading">
              <h3 id="modal-comments-heading" className="text-sm font-semibold text-ink">
                {tn("comments", comments.length)}
              </h3>

              {signedIn ? (
                <form onSubmit={handlePostComment} className="space-y-2">
                  <textarea
                    rows={2}
                    required
                    maxLength={LIMITS.commentMax}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("comment_placeholder")}
                    aria-label={t("comment_placeholder")}
                    className="input resize-y rounded-[3px] text-[16px] sm:text-sm"
                    disabled={submittingComment}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {formatNumber(commentText.length, lang)}/{formatNumber(LIMITS.commentMax, lang)}
                    </span>
                    <button type="submit" disabled={submittingComment || commentText.trim().length === 0} className="btn-primary btn-sm rounded-[3px]">
                      {submittingComment && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {submittingComment ? t("posting") : t("post_comment")}
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-xs text-danger" role="alert">
                      {commentError}
                    </p>
                  )}
                </form>
              ) : (
                <p className="rounded-[3px] border border-line bg-neutral-fill/20 px-3 py-2.5 text-xs text-muted">
                  <Link href={`/login?next=${encodeURIComponent(`/issues/${item.id}`)}`} className="link font-semibold">
                    {t("sign_in")}
                  </Link>{" "}
                  {t("to_comment")}
                </p>
              )}

              {loadingComments ? (
                <div className="flex items-center justify-center py-6 text-muted" role="status" aria-label={t("loading")}>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">{t("no_comments")}</p>
              ) : (
                <ul className="space-y-3 divide-y divide-line/60">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-2.5 pt-3 first:pt-0">
                      <Link href={`/u/${c.author.id}`} aria-label={c.author.name || t("deleted_user")} className="shrink-0">
                        <Avatar name={c.author.name} mediaId={c.author.avatarMediaId} size="sm" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-ink">
                          <Link href={`/u/${c.author.id}`} className="hover:underline">
                            {c.author.name || t("deleted_user")}
                          </Link>
                          <RoleBadge role={c.author.role} />
                        </div>
                        <p className="mt-1 whitespace-pre-line break-words text-[13.5px] leading-snug text-ink/90" data-ugc>
                          {c.body}
                        </p>
                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
                          <TimeAgo date={c.createdAt} />
                          {c.mine ? (
                            <button type="button" onClick={() => handleDeleteComment(c.id)} className="-my-1 inline-flex min-h-[28px] items-center gap-1 text-muted transition-colors hover:text-danger">
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
