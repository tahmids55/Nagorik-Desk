import type { Metadata } from "next";
import { IssueComposer } from "@/components/issue/IssueComposer";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { env } from "@/server/env";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";

export const metadata: Metadata = { title: "Report an issue", robots: { index: false } };

export default async function NewIssuePage() {
  const { user } = await requireUser("/new");
  const [{ t, lang }, areas, categories] = await Promise.all([getT(), getAreas(), getCategories()]);
  const e = env();
  const firstUpazila = areas.find((a) => a.kind === "upazila")!;
  const upazila = user.upazilaId ?? firstUpazila.id;

  return (
    <div className="mx-auto max-w-[720px] px-2.5 py-4 sm:px-4 sm:py-6">
      <div className="rounded-[4px] border border-line bg-surface shadow-none p-4 sm:p-7">
        <h1 className="text-xl sm:text-2xl font-semibold">{t("report_issue")}</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">{t("composer_intro")}</p>
        <div className="mt-5 sm:mt-6">
          <IssueComposer
            apiKey={e.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            mapId={e.NEXT_PUBLIC_GOOGLE_MAP_ID}
            categories={categories.map((c) => ({ id: c.id, name: lang === "bn" ? c.nameBn : c.nameEn, icon: c.icon }))}
            areas={areas.map((a) => ({ id: a.id, parentId: a.parentId, kind: a.kind, name: areaName(a, lang), lat: a.lat, lng: a.lng }))}
            defaultUpazila={upazila}
            defaultUnion={user.unionId ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
