import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FlagDecision } from "@/components/admin/FlagDecision";
import { RestoreButton } from "@/components/admin/RestoreButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translate";
import { flagQueue, hiddenIssues } from "@/server/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const [{ t }, queue, hidden] = await Promise.all([getT(), flagQueue(), hiddenIssues()]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin_moderation")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("moderation_hint")}</p>
      </div>

      <section aria-labelledby="q-h">
        <h2 id="q-h" className="mb-3 text-lg font-semibold">{t("flag_queue")}</h2>
        {queue.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={t("empty_flags_title")} body={t("empty_flags_body")} />
        ) : (
          <ul className="space-y-3">
            {queue.map((g) => (
              <li key={`${g.targetType}:${g.targetId}`} className="card rounded-[4px] shadow-none space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-[2px] border border-line bg-raised px-2 py-0.5 text-xs text-muted">{g.targetType === "issue" ? t("flag_target_issue") : t("flag_target_comment")}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                    <span className="h-[9px] w-[9px] rounded-[1px] bg-danger shrink-0" aria-hidden="true" />
                    {t("flag_count", { n: g.flagCount })}
                  </span>
                  {g.reasons.map((r) => (
                    <span key={r} className="rounded-[2px] border border-line bg-raised px-2 py-0.5 text-xs text-muted">{t(`flag_reason_${r}` as TKey)}</span>
                  ))}
                  {g.alreadyHidden && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warn">
                      <span className="h-[9px] w-[9px] rounded-[1px] bg-warn shrink-0" aria-hidden="true" />
                      {t("hidden_by_moderators")}
                    </span>
                  )}
                  <TimeAgo date={g.firstFlaggedAt} className="ml-auto text-faint" />
                </div>
                <p className="whitespace-pre-line rounded-[3px] bg-raised px-3 py-2 text-sm" data-ugc>{g.preview}</p>
                {g.notes.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
                    {g.notes.map((n, i) => (<li key={i} data-ugc>{n}</li>))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>{t("posted_by", { name: g.authorName ?? "–" })}</span>
                  {g.issueId && <Link href={`/issues/${g.issueId}`} className="link font-semibold" target="_blank">{t("open_issue")}</Link>}
                </div>
                <FlagDecision flagId={g.oneFlagId} alreadyHidden={g.alreadyHidden} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-h">
        <h2 id="h-h" className="mb-3 text-lg font-semibold">{t("hidden_issues")}</h2>
        {hidden.length === 0 ? (
          <p className="text-sm text-muted">{t("no_hidden")}</p>
        ) : (
          <ul className="card rounded-[4px] shadow-none divide-y divide-line">
            {hidden.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/issues/${h.id}`} className="block truncate text-sm font-semibold hover:text-brand" data-ugc>{h.title}</Link>
                  {h.reason && <p className="truncate text-xs text-muted" data-ugc>{h.reason}</p>}
                </div>
                <RestoreButton issueId={h.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
