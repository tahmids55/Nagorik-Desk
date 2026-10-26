"use client";

import { Check, Copy, Flag, MapPin, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { deleteOwnIssue } from "@/server/actions/issues";
import type { FeedItem } from "@/server/queries/feed";
import { FlagModal } from "./FlagModal";

export function PostMenu({
  item,
  signedIn,
}: {
  item: Pick<FeedItem, "id" | "title" | "status" | "isMine">;
  signedIn: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/issues/${item.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      /* ignore */
    }
  };

  const handleWithdraw = () => {
    startTransition(async () => {
      const res = await deleteOwnIssue(item.id);
      if (res.ok) {
        setConfirmOpen(false);
        router.refresh();
      }
    });
  };

  const canWithdraw = item.isMine && (item.status === "open" || item.status === "under_review");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-[3px] p-1 text-muted hover:bg-neutral-fill hover:text-ink transition-colors"
        aria-label={t("more_options")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-52 rounded-[4px] border border-line bg-surface p-1 shadow-popover"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-neutral-fill"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-ok" aria-hidden="true" />
                <span className="text-ok">{t("link_copied")}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-muted" aria-hidden="true" />
                <span>{t("copy_link")}</span>
              </>
            )}
          </button>

          <Link
            href={`/map`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-neutral-fill"
          >
            <MapPin className="h-4 w-4 text-muted" aria-hidden="true" />
            <span>{t("view_on_map")}</span>
          </Link>

          {!item.isMine && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setFlagOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-neutral-fill"
            >
              <Flag className="h-4 w-4 text-muted" aria-hidden="true" />
              <span>{t("flag_report")}</span>
            </button>
          )}

          {canWithdraw && (
            <>
              <hr className="my-1 border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-neutral-fill"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>{t("withdraw_report")}</span>
              </button>
            </>
          )}
        </div>
      )}

      {flagOpen && (
        <FlagModal
          targetType="issue"
          targetId={item.id}
          signedIn={signedIn}
          onClose={() => setFlagOpen(false)}
        />
      )}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`withdraw-title-${item.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="relative w-full max-w-sm rounded-[4px] border border-line bg-surface p-5 shadow-popover">
            <h3 id={`withdraw-title-${item.id}`} className="text-[15px] font-semibold leading-snug">
              {t("withdraw_report")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("withdraw_confirm")}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
                className="btn-secondary btn-sm rounded-[3px]"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={pending}
                className="btn-danger btn-sm rounded-[3px] !border-danger/40 !bg-danger/10 hover:!bg-danger/20"
              >
                {pending ? t("withdrawing") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
