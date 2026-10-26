"use client";

import { ChevronDown, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FieldError } from "@/components/ui/forms";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useI18n } from "@/i18n/client";
import { LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { IssueCardDTO } from "@/lib/types";
import { authorityActionsFor } from "@/lib/workflow";
import { authorityWork } from "@/server/actions/staff";
import type { ActionResult } from "@/lib/action";
import { ActionForm } from "./ActionForm";

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
        {title}
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}

function Photos({ max, state }: { max: number; state: ActionResult | null }) {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <div>
      <input type="hidden" name="mediaIds" value={ids.join(",")} />
      <ImageUploader max={max} onChange={setIds} />
      <FieldError state={state} name="media" />
    </div>
  );
}

export function AuthorityPanel({ issue }: { issue: IssueCardDTO }) {
  const { t, lang } = useI18n();
  const actions = authorityActionsFor(issue.status);
  if (actions.length === 0) return null;

  return (
    <section className="card rounded-[4px] shadow-none p-5" aria-labelledby="auth-panel-title">
      <h2 id="auth-panel-title" className="flex items-center gap-2 text-base font-semibold">
        <Wrench className="h-5 w-5 text-brand" aria-hidden="true" />
        {t("authority_actions")}
      </h2>
      {issue.dueAt && (
        <p className="mt-1 text-sm text-muted">
          {t("due_label", { date: formatDate(issue.dueAt, lang) })}
        </p>
      )}

      <div className="mt-4 border-t border-line">
        {actions.includes("acknowledge") && (
          <Section title={t("auth_acknowledge")} open>
            <ActionForm action={authorityWork} submit={t("auth_acknowledge_btn")} variant="primary">
              <input type="hidden" name="issueId" value={issue.id} />
              <input type="hidden" name="action" value="acknowledge" />
              <p className="text-sm text-muted">{t("auth_acknowledge_hint")}</p>
            </ActionForm>
          </Section>
        )}

        {actions.includes("progress") && (
          <Section title={t("auth_progress")}>
            <ActionForm action={authorityWork} submit={t("auth_progress_btn")} variant="secondary" resetOnSuccess>
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="progress" />
                  <textarea name="note" rows={3} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" aria-label={t("auth_progress")} placeholder={t("auth_progress_ph")} />
                  <FieldError state={state} name="note" />
                </>
              )}
            </ActionForm>
          </Section>
        )}

        {actions.includes("resolve") && (
          <Section title={t("auth_resolve")} open={issue.status === "in_progress"}>
            <ActionForm action={authorityWork} submit={t("auth_resolve_btn")} variant="primary" successText={t("auth_resolved_ok")}>
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="resolve" />
                  <p className="text-sm text-muted">{t("auth_resolve_hint")}</p>
                  <Photos max={LIMITS.maxProofImages} state={state} />
                  <div>
                    <label className="label" htmlFor="resolve-note">
                      {t("what_was_done")}
                    </label>
                    <textarea id="resolve-note" name="note" rows={3} maxLength={LIMITS.noteMax} className="input rounded-[3px]" />
                    <FieldError state={state} name="note" />
                  </div>
                </>
              )}
            </ActionForm>
          </Section>
        )}

        {actions.includes("request_extension") && (
          <Section title={t("auth_extension")}>
            <ActionForm action={authorityWork} submit={t("auth_extension_btn")} variant="secondary">
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="request_extension" />
                  <div>
                    <label className="label" htmlFor="newDueDate">
                      {t("new_due_date")}
                    </label>
                    <input id="newDueDate" name="newDueDate" type="date" required className="input rounded-[3px] !w-auto" />
                    <FieldError state={state} name="newDueDate" />
                  </div>
                  <div>
                    <label className="label" htmlFor="ext-note">
                      {t("reason")}
                    </label>
                    <textarea id="ext-note" name="note" rows={2} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" />
                    <FieldError state={state} name="note" />
                  </div>
                </>
              )}
            </ActionForm>
          </Section>
        )}

        {actions.includes("refer_back") && (
          <Section title={t("auth_refer")}>
            <ActionForm action={authorityWork} submit={t("auth_refer_btn")} variant="secondary">
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="refer_back" />
                  <p className="text-sm text-muted">{t("auth_refer_hint")}</p>
                  <textarea name="note" rows={3} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" aria-label={t("auth_refer")} placeholder={t("auth_refer_ph")} />
                  <FieldError state={state} name="note" />
                </>
              )}
            </ActionForm>
          </Section>
        )}
      </div>
    </section>
  );
}
