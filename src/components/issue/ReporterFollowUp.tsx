"use client";

import { CheckCircle2, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useErrorText } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { LIMITS } from "@/lib/constants";
import { confirmFix, stillAProblem } from "@/server/actions/issues";

/** After an office reports a fix, the person who reported it has the last word. */
export function ReporterFollowUp({ issueId }: { issueId: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; code?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(errorText(res.code));
    });

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5" aria-labelledby="followup-title">
      <h2 id="followup-title" className="text-base font-semibold">
        {t("followup_title")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("followup_body")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending} className="btn-primary btn-sm rounded-[3px] font-medium" onClick={() => run(() => confirmFix(issueId))}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("followup_yes")}
        </button>
        <button type="button" disabled={pending} className="btn-secondary btn-sm rounded-[3px] font-medium" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          {t("followup_no")}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-2">
          <label htmlFor="still-note" className="label">
            {t("followup_what")}
          </label>
          <textarea id="still-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={LIMITS.noteMax} className="input rounded-[3px]" />
          <button type="button" disabled={pending || note.trim().length < 5} className="btn-danger btn-sm rounded-[3px] font-medium" onClick={() => run(() => stillAProblem(issueId, note))}>
            {t("followup_send")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}
