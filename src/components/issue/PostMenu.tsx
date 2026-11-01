"use client";

import { Check, Copy, Flag, MapPin, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useErrorText } from "@/components/ui/forms";
import { Dialog, menuItemClass } from "@/components/ui/Dialog";
import { useDismiss } from "@/hooks/useDismiss";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { useI18n } from "@/i18n/client";
import { absoluteUrl, copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import { deleteOwnIssue } from "@/server/actions/issues";
import type { FeedItem } from "@/server/queries/feed";
import { FlagModal } from "./FlagModal";

export function PostMenu({
  item,
  signedIn,
  onWithdrawn,
}: {
  item: Pick<FeedItem, "id" | "title" | "status" | "isMine">;
  signedIn: boolean;
  /** Called after the author withdrew the report, so lists can drop it. */
  onWithdrawn?: () => void;
}) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDismiss(open && !phone, () => setOpen(false), menuRef);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyLink = async () => {
    if (!(await copyText(absoluteUrl(`/issues/${item.id}`)))) return;
    setCopied(true);
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1200);
  };

  const handleWithdraw = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteOwnIssue(item.id);
      if (!res.ok) return setError(errorText(res.code));
      setConfirmOpen(false);
      onWithdrawn?.();
      router.refresh();
    });
  };

  const canWithdraw = item.isMine && (item.status === "open" || item.status === "under_review");

  const items = (
    <>
      <button type="button" role="menuitem" onClick={copyLink} className={menuItemClass}>
        {copied ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Copy className="h-4 w-4 text-muted" aria-hidden="true" />}
        <span className={cn(copied && "text-ok")}>{copied ? t("link_copied") : t("copy_link")}</span>
      </button>
      <Link href={`/map?focus=${item.id}`} role="menuitem" onClick={() => setOpen(false)} className={menuItemClass}>
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
          className={menuItemClass}
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
            className={cn(menuItemClass, "text-danger")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>{t("withdraw_report")}</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[3px] p-1 text-muted transition-colors hover:bg-neutral-fill hover:text-ink active:scale-95 sm:h-8 sm:w-8"
        aria-label={t("more_options")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {phone ? (
        <Dialog open={open} onClose={() => setOpen(false)} label={t("more_options")}>
          <div role="menu" aria-label={t("more_options")} className="px-2 pb-3 pt-2">
            <p className="line-clamp-2 px-3 pb-2 text-xs text-muted" data-ugc>
              {item.title}
            </p>
            {items}
          </div>
        </Dialog>
      ) : (
        open && (
          <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-52 animate-pop-in rounded-[4px] border border-line bg-surface p-1 shadow-popover">
            {items}
          </div>
        )
      )}

      {flagOpen && <FlagModal targetType="issue" targetId={item.id} signedIn={signedIn} onClose={() => setFlagOpen(false)} />}

      <Dialog open={confirmOpen} onClose={() => !pending && setConfirmOpen(false)} title={t("withdraw_report")}>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-sm leading-relaxed text-muted">{t("withdraw_confirm")}</p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setConfirmOpen(false)} disabled={pending} className="btn-secondary btn-sm flex-1 rounded-[3px] sm:flex-none">
              {t("cancel")}
            </button>
            <button type="button" onClick={handleWithdraw} disabled={pending} className="btn-danger btn-sm flex-1 rounded-[3px] !border-danger/40 !bg-danger/10 hover:!bg-danger/20 sm:flex-none">
              {pending ? t("withdrawing") : t("delete")}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
