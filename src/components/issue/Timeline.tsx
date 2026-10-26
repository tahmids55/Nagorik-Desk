import { Check, Circle } from "lucide-react";
import { getT } from "@/i18n/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { IssueStatus } from "@/lib/constants";
import type { TimelineEntryDTO } from "@/lib/types";
import type { TKey } from "@/i18n/translate";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ImageGrid } from "./ImageGrid";

const STEPS: { key: TKey; reached: (s: IssueStatus) => boolean }[] = [
  { key: "step_reported", reached: () => true },
  { key: "step_reviewed", reached: (s) => s !== "open" },
  { key: "step_assigned", reached: (s) => ["assigned", "in_progress", "resolved"].includes(s) },
  { key: "step_in_progress", reached: (s) => ["in_progress", "resolved"].includes(s) },
  { key: "step_resolved", reached: (s) => s === "resolved" },
];

/** Five-step progress strip plus the public log of every official action. */
export async function Timeline({ status, entries }: { status: IssueStatus; entries: TimelineEntryDTO[] }) {
  const { t, lang } = await getT();

  const actor = (e: TimelineEntryDTO) => {
    if (e.actorRole === "office") return t("mp_office");
    if (e.actorRole === "authority") return e.stakeholder ? (lang === "bn" && e.stakeholder.nameBn ? e.stakeholder.nameBn : e.stakeholder.nameEn) : e.actorLabel;
    if (e.actorRole === "admin") return t("moderation_team");
    return t("reporter");
  };
  const st = (s: string | null) => (s ? t(`status_${s}` as TKey) : "");
  const date = (iso: unknown) => (typeof iso === "string" ? formatDate(iso, lang) : "");

  const line = (e: TimelineEntryDTO): string => {
    const a = actor(e);
    switch (e.kind) {
      case "assignment":
        return t("tl_assignment", { actor: a, office: e.stakeholder ? (lang === "bn" && e.stakeholder.nameBn ? e.stakeholder.nameBn : e.stakeholder.nameEn) : "", date: date(e.meta?.dueAt) });
      case "proof":
        return t("tl_proof", { actor: a });
      case "extension_requested":
        return t("tl_extension_requested", { actor: a, date: date(e.meta?.requestedDueAt) });
      case "extension_approved":
        return t("tl_extension_approved", { actor: a });
      case "extension_declined":
        return t("tl_extension_declined", { actor: a });
      case "reopened":
        return t("tl_reopened");
      case "priority":
        return e.meta?.on ? t("tl_priority_on", { actor: a }) : t("tl_priority_off", { actor: a });
      case "referred_back":
        return t("tl_referred_back", { actor: a });
      case "note":
        return e.meta?.confirmed ? t("tl_confirmed") : t("tl_note", { actor: a });
      default:
        return t("tl_status", { actor: a, status: st(e.toStatus) });
    }
  };

  const rejected = status === "rejected";
  return (
    <section className="rounded-[4px] border border-line bg-surface p-5" aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-base font-semibold">
        {t("progress")}
      </h2>

      {rejected ? (
        <p className="mt-3 rounded-[3px] border border-line px-3 py-2 text-sm text-muted">{t("closed_without_fix")}</p>
      ) : (
        <ol className="mt-4 flex items-start" aria-label={t("progress")}>
          {STEPS.map((s, i) => {
            const done = s.reached(status);
            return (
              <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={done && !STEPS[i + 1]?.reached(status) ? "step" : undefined}>
                {i > 0 && <span className={cn("absolute right-1/2 top-3 h-0.5 w-full", done ? "bg-brand" : "bg-line")} aria-hidden="true" />}
                <span className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-[3px] border", done ? "border-brand bg-brand text-[var(--btn-primary-text)]" : "border-line bg-surface text-faint")}>
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-2 w-2" aria-hidden="true" />}
                </span>
                <span className={cn("mt-1.5 px-0.5 text-[11px] font-semibold leading-tight sm:text-xs", done ? "text-ink" : "text-faint")}>{t(s.key)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {entries.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{t("no_updates_yet")}</p>
      ) : (
        <ol className="mt-5 space-y-4 border-l border-line pl-4">
          {[...entries].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-[1px] bg-brand" aria-hidden="true" />
              <p className="text-sm font-semibold">{line(e)}</p>
              {e.body && (
                <p className="mt-1 whitespace-pre-line border-l-2 border-line pl-3 py-0.5 text-sm text-ink/90" data-ugc>
                  {e.body}
                </p>
              )}
              {e.images.length > 0 && (
                <div className="mt-2 max-w-md">
                  <ImageGrid ids={e.images} alt={t("proof_photo")} />
                </div>
              )}
              <TimeAgo date={e.createdAt} className="mt-1 block text-xs text-faint" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
