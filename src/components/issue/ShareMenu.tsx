"use client";

import { Check, Facebook, Link2, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

const itemClass = "flex w-full items-center gap-2.5 rounded-[3px] px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-neutral-fill focus-visible:bg-neutral-fill focus-visible:outline-none";

export function ShareMenu({ path, title }: { path: string; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [url, setUrl] = useState("");
  const [alignRight, setAlignRight] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      // Absolute URL is resolved at open time to avoid SSR/client mismatch.
      setUrl(`${window.location.origin}${path}`);
      // Keep the 13rem popover inside the viewport: align to whichever edge has room.
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAlignRight(rect.left + 208 > window.innerWidth - 8);
      setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
    setOpen(!open);
  }

  async function copy() {
    const link = url || `${window.location.origin}${path}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: url || `${window.location.origin}${path}` });
    } catch {
      /* user dismissed the sheet */
    }
    setOpen(false);
  }

  const encodedUrl = encodeURIComponent(url);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  return (
    <div ref={rootRef} className="relative">
      <button ref={triggerRef} type="button" onClick={toggle} className="btn-ghost btn-sm rounded-[3px]" aria-label={t("share")} aria-haspopup="menu" aria-expanded={open}>
        <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="hidden sm:inline">{copied ? t("link_copied") : t("share")}</span>
      </button>
      {open && (
        <div role="menu" aria-label={t("share")} className={`absolute bottom-full z-30 mb-1 w-52 max-w-[calc(100vw-1rem)] rounded-[4px] border border-line bg-surface p-1 shadow-popover ${alignRight ? "right-0" : "left-0"}`}>
          <a role="menuitem" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={itemClass}>
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("share_whatsapp")}
          </a>
          <a role="menuitem" href={facebook} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={itemClass}>
            <Facebook className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("share_facebook")}
          </a>
          <button type="button" role="menuitem" onClick={copy} className={itemClass}>
            {copied ? <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" /> : <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span aria-live="polite">{copied ? t("link_copied") : t("share_copy_link")}</span>
          </button>
          {canNativeShare && (
            <button type="button" role="menuitem" onClick={nativeShare} className={itemClass}>
              <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("share_more")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
