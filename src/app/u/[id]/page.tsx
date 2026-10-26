import { BadgeCheck, Briefcase, CalendarDays, MapPin, Pencil, Shield, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Feed } from "@/components/issue/Feed";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { getSession } from "@/server/auth/session";
import { loadFeed } from "@/server/queries/feed";
import { areaName, getAreas, getStakeholders } from "@/server/queries/reference";
import { getProfile } from "@/server/queries/users";
import { Megaphone } from "lucide-react";

type Props = { params: { id: string }; searchParams: { tab?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProfile(params.id);
  return p ? { title: p.name, robots: { index: false } } : { title: "Not found" };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ t, lang }, session, areas] = await Promise.all([getT(), getSession(), getAreas()]);
  const profile = await getProfile(params.id);
  if (!profile) notFound();

  const own = session?.user.id === profile.id;
  const tab = own && searchParams.tab === "supported" ? "supported" : "posts";
  const viewer = session ? { id: session.user.id, role: session.user.role } : null;
  const query = tab === "supported" ? { votedBy: profile.id, sort: "new" as const } : { authorId: profile.id, sort: "new" as const };
  const { items, hasMore } = await loadFeed({ ...query, includeAnonymousOfAuthor: true }, viewer, lang);

  const area = areas.find((a) => a.id === profile.unionId) ?? areas.find((a) => a.id === profile.upazilaId);
  const upazila = areas.find((a) => a.id === profile.upazilaId);
  const areaLabel = profile.unionId && upazila ? `${areaName(area, lang)}, ${areaName(upazila, lang)}` : areaName(area, lang);
  const stakeholder = profile.stakeholderId ? (await getStakeholders()).find((s) => s.id === profile.stakeholderId) : undefined;
  const n = (v: number) => formatNumber(v, lang);

  const roleChip =
    profile.role === "office" ? { icon: Briefcase, label: t("role_office") }
    : profile.role === "authority" ? { icon: Wrench, label: t("role_authority") }
    : profile.role === "admin" ? { icon: Shield, label: t("role_admin") }
    : null;

  return (
    <div className="mx-auto max-w-[860px] px-3 pb-6 sm:px-4">
      <section className="card rounded-[4px] shadow-none mt-4 overflow-hidden">
        <div className="h-32 bg-brand-tint border-b border-line sm:h-40" aria-hidden="true" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
            <Avatar name={profile.name} mediaId={profile.avatarMediaId} size="xl" className="ring-4 ring-surface" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-2xl font-semibold">{profile.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {roleChip && (
                  <span className="inline-flex items-center gap-1 rounded-[2px] border border-brand/40 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                    <roleChip.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {roleChip.label}
                    {profile.role === "authority" && stakeholder && ` · ${lang === "bn" && stakeholder.nameBn ? stakeholder.nameBn : stakeholder.nameEn}`}
                  </span>
                )}
                {areaLabel && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {areaLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("joined", { date: formatDate(profile.joinedAt, lang) })}
                </span>
              </p>
            </div>
            {own && (
              <Link href="/settings" className="btn-secondary btn-sm rounded-[3px] font-medium">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {t("edit_profile")}
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 text-[15px]" data-ugc>
              {profile.bio}
            </p>
          )}

          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("verification")}>
            {profile.emailVerified && (
              <li className="inline-flex items-center gap-1.5 rounded-[2px] border border-ok/40 px-2 py-0.5 text-xs font-medium text-ok">
                <span className="h-[9px] w-[9px] rounded-[1px] bg-ok shrink-0" aria-hidden="true" />
                {t("email_verified")}
              </li>
            )}
            {profile.phoneVerified && (
              <li className="inline-flex items-center gap-1.5 rounded-[2px] border border-ok/40 px-2 py-0.5 text-xs font-medium text-ok">
                <span className="h-[9px] w-[9px] rounded-[1px] bg-ok shrink-0" aria-hidden="true" />
                {t("phone_verified")}
              </li>
            )}
            {profile.nidVerified && (
              <li className="inline-flex items-center gap-1.5 rounded-[2px] border border-ok/40 px-2 py-0.5 text-xs font-medium text-ok">
                <span className="h-[9px] w-[9px] rounded-[1px] bg-ok shrink-0" aria-hidden="true" />
                {t("nid_verified")}
              </li>
            )}
            {!profile.emailVerified && !profile.phoneVerified && !profile.nidVerified && (
              <li className="rounded-[2px] border border-line px-2 py-0.5 text-xs text-faint">
                {t("not_verified_yet")}
              </li>
            )}
          </ul>

          <dl className="mt-5 grid grid-cols-3 gap-3 text-left">
            {[
              [profile.stats.posts, "stat_posts"],
              [profile.stats.supportReceived, "stat_support"],
              [profile.stats.resolved, "stat_resolved_posts"],
            ].map(([v, k]) => (
              <div key={k as string} className="rounded-[3px] bg-raised px-3 py-2.5">
                <dd className="text-xl font-medium tabular-nums">{n(v as number)}</dd>
                <dt className="text-xs text-muted">{t(k as "stat_posts")}</dt>
              </div>
            ))}
          </dl>
        </div>

        <nav className="flex border-t border-line px-3" aria-label={t("profile_tabs")}>
          {[
            { href: `/u/${profile.id}`, label: t("tab_posts"), on: tab === "posts" },
            ...(own ? [{ href: `/u/${profile.id}?tab=supported`, label: t("tab_supported"), on: tab === "supported" }] : []),
          ].map((x) => (
            <Link key={x.href} href={x.href} aria-current={x.on ? "page" : undefined} className={cn("relative px-4 py-3 text-sm font-semibold", x.on ? "text-brand after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-[2px] after:bg-brand" : "text-muted hover:text-ink")}>
              {x.label}
            </Link>
          ))}
        </nav>
      </section>

      <div className="mx-auto mt-4 max-w-[680px]">
        {items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={own ? (tab === "supported" ? t("empty_supported_title") : t("empty_my_posts_title")) : t("empty_user_posts_title")}
            body={own ? (tab === "supported" ? t("empty_supported_body") : t("empty_my_posts_body")) : undefined}
            action={own && tab === "posts" ? <Link href="/new" className="btn-primary rounded-[3px] font-medium">{t("report_first_issue")}</Link> : undefined}
          />
        ) : (
          <Feed key={tab} initial={items} hasMore={hasMore} query={query} signedIn={!!session} />
        )}
      </div>
    </div>
  );
}
