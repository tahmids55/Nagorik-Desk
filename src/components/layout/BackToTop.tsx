"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

const THRESHOLD = 600;

export function BackToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label={t("back_to_top")}
      title={t("back_to_top")}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      className="fixed right-4 z-30 flex h-10 w-10 items-center justify-center rounded-[3px] border border-line bg-surface text-muted shadow-sm transition-colors hover:border-brand/50 hover:text-brand bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
    >
      <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
