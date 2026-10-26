"use client";

import { Briefcase, ChevronDown, Star } from "lucide-react";
import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/forms";
import { useI18n } from "@/i18n/client";
import { DEADLINE_DAYS, LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { IssueCardDTO } from "@/lib/types";
import { officeActionsFor } from "@/lib/workflow";
import { decideExtension, postOfficeNote, setPriority, triageIssue } from "@/server/actions/staff";
import { ActionForm } from "./ActionForm";

export type StakeholderOption = { id: string; name: string; upazilaId: string | null };
export type PendingExtension = { requestedDueAt: string; reason: string | null } | null;

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

export function OfficePanel({ issue, stakeholders, pendingExtension }: { issue: IssueCardDTO; stakeholders: StakeholderOption[]; pendingExtension: PendingExtension }) {
  const { t, lang } = useI18n();
  const actions = officeActionsFor(issue.status);
  const eligible = stakeholders.filter((s) => s.upazilaId === null || s.upazilaId === issue.upazilaId);

  return (
    <section className="card rounded-[4px] shadow-none p-5" aria-labelledby="office-panel-title">
      <h2 id="office-panel-title" className="flex items-center gap-2 text-base font-semibold">
        <Briefcase className="h-5 w-5 text-brand" aria-hidden="true" />
        {t("office_actions")}
      </h2>
      <p className="mt-1 text-xs text-muted">{t("office_actions_hint")}</p>

      <div className="mt-4 border-t border-line">
        {pendingExtension && (
          <Section title={t("extension_pending_title")} open>
            <p className="mb-3 text-sm text-muted">
              {t("extension_pending_body", { date: formatDate(pendingExtension.requestedDueAt, lang) })}
            </p>
            {pendingExtension.reason && (
              <p className="mb-3 border-l-2 border-line pl-3 py-1 text-sm" data-ugc>
                {pendingExtension.reason}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <ActionForm action={decideExtension} submit={t("approve")} variant="primary" className="contents">
                <input type="hidden" name="issueId" value={issue.id} />
                <input type="hidden" name="decision" value="approve" />
              </ActionForm>
              <ActionForm action={decideExtension} submit={t("decline")} variant="secondary" className="contents">
                <input type="hidden" name="issueId" value={issue.id} />
                <input type="hidden" name="decision" value="decline" />
              </ActionForm>
            </div>
          </Section>
        )}

        {actions.includes("review") && (
          <Section title={t("act_review")}>
            <ActionForm action={triageIssue} submit={t("act_review_btn")} variant="secondary">
              <input type="hidden" name="issueId" value={issue.id} />
              <input type="hidden" name="action" value="review" />
              <p className="text-sm text-muted">{t("act_review_hint")}</p>
            </ActionForm>
          </Section>
        )}

        {actions.includes("assign") && (
          <Section title={issue.status === "assigned" ? t("act_reassign") : t("act_assign")} open={issue.status === "open" || issue.status === "under_review"}>
            <ActionForm action={triageIssue} submit={t("act_assign_btn")} variant="primary" successText={t("assigned_ok")}>
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="assign" />
                  <div>
                    <label className="label" htmlFor="stakeholderId">
                      {t("responsible_office")}
                    </label>
                    <select id="stakeholderId" name="stakeholderId" className="input rounded-[3px]" required defaultValue={issue.stakeholder?.id ?? ""}>
                      <option value="">{t("select")}</option>
                      {eligible.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <FieldError state={state} name="stakeholderId" />
                    {eligible.length === 0 && <p className="hint">{t("no_stakeholders_hint")}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="deadlineDays">
                      {t("deadline_days")}
                    </label>
                    <input id="deadlineDays" name="deadlineDays" type="number" min={1} max={60} defaultValue={issue.isUrgent ? DEADLINE_DAYS.urgent : DEADLINE_DAYS.normal} className="input rounded-[3px] !w-28" />
                    <p className="hint">{t("deadline_hint")}</p>
                  </div>
                  <div>
                    <label className="label" htmlFor="assign-note">
                      {t("public_note")} <span className="font-normal text-faint">({t("optional")})</span>
                    </label>
                    <textarea id="assign-note" name="note" rows={2} maxLength={LIMITS.noteMax} className="input rounded-[3px]" />
                    <FieldError state={state} name="note" />
                  </div>
                </>
              )}
            </ActionForm>
          </Section>
        )}

        {actions.includes("reject") && (
          <Section title={t("act_reject")}>
            <ActionForm action={triageIssue} submit={t("act_reject_btn")} variant="danger">
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="reject" />
                  <label className="label" htmlFor="reject-note">
                    {t("public_reason")}
                  </label>
                  <textarea id="reject-note" name="note" rows={3} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" placeholder={t("reject_placeholder")} />
                  <FieldError state={state} name="note" />
                </>
              )}
            </ActionForm>
          </Section>
        )}

        {actions.includes("reopen") && (
          <Section title={t("act_reopen")}>
            <ActionForm action={triageIssue} submit={t("act_reopen_btn")} variant="secondary">
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="action" value="reopen" />
                  <label className="label" htmlFor="reopen-note">
                    {t("public_reason")}
                  </label>
                  <textarea id="reopen-note" name="note" rows={2} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" />
                  <FieldError state={state} name="note" />
                </>
              )}
            </ActionForm>
          </Section>
        )}

        <Section title={t("act_note")}>
          <ActionForm action={postOfficeNote} submit={t("act_note_btn")} variant="secondary" resetOnSuccess>
            {(state) => (
              <>
                <input type="hidden" name="issueId" value={issue.id} />
                <textarea name="note" rows={3} required maxLength={LIMITS.noteMax} className="input rounded-[3px]" aria-label={t("act_note")} />
                <FieldError state={state} name="note" />
              </>
            )}
          </ActionForm>
        </Section>

        {issue.status !== "resolved" && issue.status !== "rejected" && (
          <Section title={issue.mpPriority ? t("priority_manage") : t("priority_make")}>
            <ActionForm action={setPriority} submit={issue.mpPriority ? t("priority_update") : t("priority_make_btn")} variant="secondary">
              {(state) => (
                <>
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="on" value="1" />
                  <div>
                    <label className="label" htmlFor="commitment">
                      {t("commitment")}
                    </label>
                    <textarea id="commitment" name="commitment" rows={2} required maxLength={280} defaultValue={issue.mpCommitment ?? ""} className="input rounded-[3px]" placeholder={t("commitment_ph")} />
                    <FieldError state={state} name="commitment" />
                  </div>
                  <div>
                    <label className="label" htmlFor="targetDate">
                      {t("target_date_label")}
                    </label>
                    <input id="targetDate" name="targetDate" type="date" required defaultValue={issue.mpTargetDate ?? ""} className="input rounded-[3px] !w-auto" />
                    <FieldError state={state} name="targetDate" />
                  </div>
                </>
              )}
            </ActionForm>
            {issue.mpPriority && (
              <ActionForm action={setPriority} submit={t("priority_remove")} variant="secondary" className="mt-3">
                <input type="hidden" name="issueId" value={issue.id} />
                <input type="hidden" name="on" value="0" />
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("priority_limit_note")}
                </p>
              </ActionForm>
            )}
          </Section>
        )}
      </div>
    </section>
  );
}
