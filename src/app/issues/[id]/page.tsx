import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Comments } from "@/components/issue/Comments";
import { PostCard } from "@/components/issue/PostCard";
import { ReporterFollowUp } from "@/components/issue/ReporterFollowUp";
import { Timeline } from "@/components/issue/Timeline";
import { RestoreButton } from "@/components/admin/RestoreButton";
import { AuthorityPanel } from "@/components/staff/AuthorityPanel";
import { OfficePanel, type PendingExtension } from "@/components/staff/OfficePanel";
import { getT } from "@/i18n/server";
import { getSession } from "@/server/auth/session";
import { decorate } from "@/server/queries/feed";
import { findSimilar, getComments, getIssue, getTimeline } from "@/server/queries/issues";
import { getStakeholders } from "@/server/queries/reference";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getSession();
  const issue = await getIssue(params.id, session ? { id: session.user.id, role: session.user.role } : null);
  if (!issue) return { title: "Not found" };
  const desc = issue.body.replace(/\s+/g, " ").slice(0, 160);
  return { title: issue.title, description: desc, openGraph: { title: issue.title, description: desc, type: "article" }, robots: issue.hidden ? { index: false } : undefined };
}

export default async function IssuePage({ params }: Props) {
  const [{ t, lang }, session] = await Promise.all([getT(), getSession()]);
  const viewer = session ? { id: session.user.id, role: session.user.role } : null;
  const issue = await getIssue(params.id, viewer);
  if (!issue) notFound();

  const [[item], entries, comments, similar] = await Promise.all([
    decorate([issue], lang),
    getTimeline(issue.id),
    getComments(issue.id, viewer?.id ?? null),
    issue.precise ? findSimilar({ lat: issue.lat, lng: issue.lng, categoryId: issue.categoryId, title: issue.title }, 300, issue.id) : Promise.resolve([]),
  ]);

  const role = session?.user.role;
  const isAssignedAuthority = role === "authority" && !!issue.stakeholder && session?.user.stakeholderId === issue.stakeholder.id;

  let pending: PendingExtension = null;
  const lastExt = [...entries].reverse().find((e) => e.kind.startsWith("extension_"));
  if (lastExt?.kind === "extension_requested" && typeof lastExt.meta?.requestedDueAt === "string") {
    pending = { requestedDueAt: lastExt.meta.requestedDueAt, reason: lastExt.body };
  }
  const stakeholders = role === "office" ? (await getStakeholders({ activeOnly: true })).map((s) => ({ id: s.id, name: lang === "bn" && s.nameBn ? s.nameBn : s.nameEn, upazilaId: s.upazilaId })) : [];

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4 px-3 py-5 sm:px-4">
      {/* Top Breadcrumb & Reference Bar */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back_to_feed")}
        </Link>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-[2px] bg-surface border border-line text-muted tabular-nums">
          PG-{String(issue.seq).padStart(5, "0")}
        </span>
      </div>

      {issue.hidden && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn" role="status">
          <span>{role === "admin" ? t("hidden_notice_admin") : t("hidden_notice_author")}</span>
          {role === "admin" && <RestoreButton issueId={issue.id} />}
        </div>
      )}

      {/* Main Post Card */}
      <PostCard item={item!} signedIn={!!session} detail />

      {/* Location Details Card */}
      <section className="rounded-[4px] border border-line bg-surface p-4 shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{t("location")}</h2>
            <p className="mt-1.5 flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>
                {item!.labels.area}
                {issue.landmark && (
                  <>
                    <br />
                    <span data-ugc>{issue.landmark}</span>
                  </>
                )}
                {!issue.precise && (
                  <>
                    <br />
                    <span className="text-xs text-faint">({t("approximate")})</span>
                  </>
                )}
              </span>
            </p>
          </div>
          <Link href={`/map?focus=${issue.id}`} className="btn-secondary btn-sm shrink-0 rounded-[3px]">
            {t("open_map")}
          </Link>
        </div>
      </section>

      {issue.mpPriority && issue.mpCommitment && (
        <section className="rounded-[4px] border border-brand/40 bg-brand-soft p-5 shadow-none">
          <h2 className="text-sm font-semibold text-brand">{t("mp_commitment")}</h2>
          <p className="mt-1.5 text-[15px]" data-ugc>
            {issue.mpCommitment}
          </p>
          {issue.mpTargetDate && <p className="mt-2 text-xs text-muted">{t("target_date", { date: issue.mpTargetDate })}</p>}
        </section>
      )}

      {issue.isMine && issue.status === "resolved" && !issue.confirmed && <ReporterFollowUp issueId={issue.id} />}
      {role === "office" && <OfficePanel issue={issue} stakeholders={stakeholders} pendingExtension={pending} />}
      {isAssignedAuthority && <AuthorityPanel issue={issue} />}

      {/* Timeline Section */}
      <Timeline status={issue.status} entries={entries} />

      {/* Comments Section */}
      <Comments issueId={issue.id} comments={comments} signedIn={!!session} />

      {/* Nearby Similar Issues */}
      {similar.length > 0 && (
        <section className="rounded-[4px] border border-line bg-surface p-4 shadow-none">
          <h2 className="text-sm font-semibold">{t("nearby_similar")}</h2>
          <ul className="mt-3 divide-y divide-line">
            {similar.map((s) => (
              <li key={s.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={`/issues/${s.id}`} className="block hover:text-brand">
                  <span className="line-clamp-2 text-sm font-medium" data-ugc>
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{t("meters_away", { n: s.distanceM })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
