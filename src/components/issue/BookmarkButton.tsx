"use client";

import { Bookmark } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useErrorText } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { toggleBookmark } from "@/server/actions/bookmarks";

type Props = {
  issueId: string;
  initialSaved: boolean;
  signedIn: boolean;
  showLabel?: boolean;
};

/** Save / unsave an issue. Optimistic: the icon fills immediately and rolls back if the server refuses. */
export function BookmarkButton({ issueId, initialSaved, signedIn, showLabel = false }: Props) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const busy = useRef(false);

  const toggle = () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(pathname)}`);
    if (busy.current) return;
    busy.current = true;
    setError(null);

    const prev = saved;
    setSaved(!prev);

    start(async () => {
      try {
        const res = await toggleBookmark(issueId);
        if (res.ok) setSaved(res.data!.saved);
        else {
          setSaved(prev);
          setError(errorText(res.code, res.retryAfterSec));
        }
      } catch {
        setSaved(prev);
        setError(errorText("unknown"));
      } finally {
        busy.current = false;
      }
    });
  };

  const label = saved ? t("bookmarked") : t("save");
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? t("unsave") : t("save")}
        title={saved ? t("unsave") : t("save")}
        className={cn("btn-ghost btn-sm h-9 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2 sm:px-2.5 gap-1.5 rounded-[3px] active:scale-95", saved ? "text-brand" : "text-muted")}
      >
        <Bookmark className="h-[18px] w-[18px]" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        <span className={cn("text-sm font-medium", !showLabel && "hidden sm:inline")}>{label}</span>
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}
