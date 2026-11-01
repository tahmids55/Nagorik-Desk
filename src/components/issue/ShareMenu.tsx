"use client";

import { Check, Facebook, Link2, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, menuItemClass } from "@/components/ui/Dialog";
import { useDismiss } from "@/hooks/useDismiss";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { useI18n } from "@/i18n/client";
import { absoluteUrl, copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

/** WhatsApp, Facebook, copy link and the system share sheet. A bottom sheet on phones, a popover elsewhere. */
export function ShareMenu({ path, title, showLabel = false, className }: { path: string; title: string; showLabel?: boolean; className?: string }) {
  const { t } = useI18n();
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [url, setUrl] = useState("");
  const [alignRight, setAlignRight] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  useDismiss(open && !phone, () => setOpen(false), rootRef);

  function toggle() {
    if (!open) {
      // Absolute URL is resolved at open time to avoid an SSR/client mismatch.
      setUrl(absoluteUrl(path));
      // Keep the 13rem popover inside the viewport: align to whichever edge has room.
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAlignRight(rect.left + 208 > window.innerWidth - 8);
      setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
    setOpen(!open);
  }

  async function copy() {
    if (!(await copyText(url || absoluteUrl(path)))) return;
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1500);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: url || absoluteUrl(path) });
    } catch {
      /* user dismissed the sheet */
    }
    setOpen(false);
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const items = (
    <>
      {canNativeShare && phone && (
        <button type="button" role="menuitem" onClick={nativeShare} className={menuItemClass}>
          <Share2 className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
          {t("share_more")}
        </button>
      )}
      <a role="menuitem" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={menuItemClass}>
        <MessageCircle className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
        {t("share_whatsapp")}
      </a>
      <a role="menuitem" href={facebook} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={menuItemClass}>
        <Facebook className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
        {t("share_facebook")}
      </a>
      <button type="button" role="menuitem" onClick={copy} className={menuItemClass}>
        {copied ? <Check className="h-[18px] w-[18px] shrink-0 text-ok" aria-hidden="true" /> : <Link2 className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />}
        <span aria-live="polite" className={cn(copied && "text-ok")}>
          {copied ? t("link_copied") : t("share_copy_link")}
        </span>
      </button>
      {canNativeShare && !phone && (
        <button type="button" role="menuitem" onClick={nativeShare} className={menuItemClass}>
          <MoreHorizontal className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
          {t("share_more")}
        </button>
      )}
    </>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="btn-ghost btn-sm h-9 min-h-[36px] rounded-[3px] px-2.5 active:scale-95"
        aria-label={t("share")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className={cn(!showLabel && "hidden sm:inline")}>{copied ? t("link_copied") : t("share")}</span>
      </button>
      {phone ? (
        <Dialog open={open} onClose={() => setOpen(false)} title={t("share")}>
          <div role="menu" aria-label={t("share")} className="px-2 pb-3">
            {items}
          </div>
        </Dialog>
      ) : (
        open && (
          <div
            role="menu"
            aria-label={t("share")}
            className={cn("absolute bottom-full z-30 mb-1.5 w-52 animate-pop-in rounded-[4px] border border-line bg-surface p-1 shadow-popover", alignRight ? "right-0" : "left-0")}
          >
            {items}
          </div>
        )
      )}
    </div>
  );
}
