import { ImageIcon, MapPin, Megaphone } from "lucide-react";
import Link from "next/link";
import { Feed } from "@/components/issue/Feed";
import { FilterBar, type Option } from "@/components/issue/FilterBar";
import { SidebarLeft, SidebarRight } from "@/components/layout/Sidebars";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { SORTS } from "@/lib/constants";
import { getSession } from "@/server/auth/session";
import { loadFeed } from "@/server/queries/feed";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;
const STATUSES = ["open", "progress", "resolved", "rejected", "overdue"] as const;

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const [{ t, lang }, session, areas, categories] = await Promise.all([getT(), getSession(), getAreas(), getCategories()]);

  const sortRaw = one(searchParams.sort);
  const statusRaw = one(searchParams.status);
  const query = {
    q: one(searchParams.q)?.slice(0, 80) || undefined,
    area: areas.some((a) => a.id === one(searchParams.area)) ? one(searchParams.area) : undefined,
    category: categories.some((c) => c.id === one(searchParams.category)) ? one(searchParams.category) : undefined,
    status: (STATUSES as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as (typeof STATUSES)[number]) : undefined,
    urgent: one(searchParams.urgent) === "1" ? true : undefined,
    sort: (SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as (typeof SORTS)[number]) : ("hot" as const),
  };

  const viewer = session ? { id: session.user.id, role: session.user.role } : null;
  const { items, hasMore } = await loadFeed(query, viewer, lang);
  const filtered = !!(query.q || query.area || query.category || query.status || query.urgent);

  const areaOptions: Option[] = [
    ...areas.filter((a) => a.kind === "upazila").flatMap((up) => [
      { value: up.id, label: areaName(up, lang) },
      ...areas.filter((a) => a.parentId === up.id).map((un) => ({ value: un.id, label: `\u00A0\u00A0· ${areaName(un, lang)}` })),
    ]),
  ];
  const categoryOptions: Option[] = categories.map((c) => ({ value: c.id, label: lang === "bn" ? c.nameBn : c.nameEn }));

  return (
    <div className="mx-auto grid max-w-[1280px] gap-5 px-3 pt-4 sm:px-4 lg:grid-cols-[250px_minmax(0,1fr)_300px] xl:grid-cols-[270px_minmax(0,1fr)_320px]">
      <aside className="hidden lg:block">
        <div className="sticky top-[72px]">
          <SidebarLeft />
        </div>
      </aside>

      <div className="mx-auto w-full max-w-[680px] space-y-4">
        {session ? (
          <Link href="/new" className="rounded-[4px] border border-line bg-surface shadow-none flex items-center gap-3 p-3 hover:border-brand/50">
            <Avatar name={session.user.name} mediaId={session.user.avatarMediaId} />
            <span className="flex-1 rounded-[3px] bg-raised px-4 py-2.5 text-[15px] text-faint">{t("composer_prompt", { name: session.user.name.split(" ")[0] ?? "" })}</span>
            <span className="hidden gap-3 pr-1 text-brand sm:flex" aria-hidden="true">
              <ImageIcon className="h-5 w-5" />
              <MapPin className="h-5 w-5" />
            </span>
          </Link>
        ) : (
          <div className="rounded-[4px] border border-line bg-surface shadow-none flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-brand-soft text-brand">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t("hero_title")}</p>
              <p className="text-xs text-muted">{t("hero_body")}</p>
            </div>
            <Link href="/register" className="btn-primary btn-sm shrink-0 rounded-[3px]">
              {t("join")}
            </Link>
          </div>
        )}

        <FilterBar areas={areaOptions} categories={categoryOptions} />

        {items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={filtered ? t("empty_filtered_title") : t("empty_feed_title")}
            body={filtered ? t("empty_filtered_body") : t("empty_feed_body")}
            action={
              filtered ? (
                <Link href="/" className="btn-secondary rounded-[3px]">
                  {t("clear_filters")}
                </Link>
              ) : (
                <Link href={session ? "/new" : "/register"} className="btn-primary rounded-[3px]">
                  {session ? t("report_first_issue") : t("create_account")}
                </Link>
              )
            }
          />
        ) : (
          <Feed key={JSON.stringify(query)} initial={items} hasMore={hasMore} query={query} signedIn={!!session} />
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-[72px]">
          <SidebarRight />
        </div>
      </aside>
    </div>
  );
}
