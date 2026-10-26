"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useErrorText } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import type { VoteValue } from "@/lib/types";
import { castVote } from "@/server/actions/issues";

type Props = {
  issueId: string;
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteValue;
  isMine: boolean;
  signedIn: boolean;
  size?: "md" | "lg";
};

/** Upvote / downvote pill. Optimistic: the number moves immediately, and rolls back if the server refuses. */
export function VoteBar({ issueId, score, upvotes, downvotes, myVote, isMine, signedIn, size = "md" }: Props) {
  const { t, lang } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ score, upvotes, downvotes, myVote });
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const busy = useRef(false);

  const vote = (value: 1 | -1) => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(pathname)}`);
    if (isMine) return setError(t("err_own_issue"));
    if (busy.current) return;
    busy.current = true;
    setError(null);

    const prev = state;
    const next = prev.myVote === value ? 0 : value;
    const delta = (v: number) => ({ up: v === 1 ? 1 : 0, down: v === -1 ? 1 : 0 });
    const was = delta(prev.myVote);
    const now = delta(next);
    setState({
      myVote: next as VoteValue,
      upvotes: prev.upvotes - was.up + now.up,
      downvotes: prev.downvotes - was.down + now.down,
      score: prev.score - prev.myVote + next,
    });

    start(async () => {
      const res = await castVote(issueId, value);
      busy.current = false;
      if (res.ok) setState(res.data!);
      else {
        setState(prev);
        setError(errorText(res.code, res.retryAfterSec));
      }
    });
  };

  const big = size === "lg";
  const iconCls = big ? "h-7 w-7" : "h-[22px] w-[22px]";
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("inline-flex items-center rounded-[3px] border border-line bg-surface", big ? "gap-1 px-1.5 py-1" : "gap-0.5 px-1 py-0.5")}
        role="group"
        aria-label={t("vote_group")}
        title={t("vote_counts", { up: formatNumber(state.upvotes, lang), down: formatNumber(state.downvotes, lang) })}
      >
        <button
          type="button"
          onClick={() => vote(1)}
          aria-pressed={state.myVote === 1}
          aria-label={t("upvote")}
          className={cn("flex h-8 w-8 items-center justify-center rounded-[3px] transition-colors hover:bg-brand/15", state.myVote === 1 ? "text-brand" : "text-muted", big && "h-10 w-10")}
        >
          <ArrowBigUp className={iconCls} fill={state.myVote === 1 ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <span className={cn("min-w-[2ch] text-center font-semibold tabular-nums", big ? "px-1 text-lg" : "text-sm", state.myVote === 1 && "text-brand", state.myVote === -1 && "text-danger")} aria-live="polite">
          {formatNumber(state.score, lang)}
        </span>
        <button
          type="button"
          onClick={() => vote(-1)}
          aria-pressed={state.myVote === -1}
          aria-label={t("downvote")}
          className={cn("flex h-8 w-8 items-center justify-center rounded-[3px] transition-colors hover:bg-danger/15", state.myVote === -1 ? "text-danger" : "text-muted", big && "h-10 w-10")}
        >
          <ArrowBigDown className={iconCls} fill={state.myVote === -1 ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
