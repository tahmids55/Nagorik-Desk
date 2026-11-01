"use client";

import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { FlagModal } from "./FlagModal";

export function FlagButton({ targetType, targetId, signedIn, compact = false }: { targetType: "issue" | "comment"; targetId: string; signedIn: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={compact ? "-my-1 inline-flex min-h-[28px] items-center gap-1 rounded-[3px] px-1 text-xs text-faint hover:text-ink" : "btn-ghost btn-sm rounded-[3px]"}
        onClick={() => (signedIn ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}
        aria-haspopup="dialog"
        aria-label={t("flag_report")}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {!compact && <span className="hidden sm:inline">{t("flag_report")}</span>}
      </button>
      {open && <FlagModal targetType={targetType} targetId={targetId} signedIn={signedIn} onClose={() => setOpen(false)} />}
    </>
  );
}
