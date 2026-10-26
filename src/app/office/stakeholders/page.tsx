import { Building2, ChevronDown } from "lucide-react";
import { AppointForm, RevokeButton, StakeholderForm, ToggleActive } from "@/components/staff/StakeholderForms";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import type { TKey } from "@/i18n/translate";
import { areaName, getAreas, getStakeholders } from "@/server/queries/reference";
import { authorityUsers } from "@/server/queries/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offices" };

export default async function StakeholdersPage() {
  const [{ t, lang }, areas, offices, officers] = await Promise.all([getT(), getAreas(), getStakeholders(), authorityUsers()]);
  const upazilas = areas.filter((a) => a.kind === "upazila").map((a) => ({ id: a.id, name: areaName(a, lang) }));
  const nm = (s: { nameEn: string; nameBn: string | null }) => (lang === "bn" && s.nameBn ? s.nameBn : s.nameEn);
  const active = offices.filter((o) => o.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("office_stakeholders")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("stakeholders_intro")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="list-h" className="space-y-3">
          <h2 id="list-h" className="text-lg font-semibold">{t("offices_list")}</h2>
          {offices.length === 0 ? (
            <EmptyState icon={Building2} title={t("empty_offices_title")} body={t("empty_offices_body")} />
          ) : (
            offices.map((o) => {
              const people = officers.filter((p) => p.stakeholderId === o.id);
              return (
                <details key={o.id} className="card rounded-[4px] shadow-none group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
                    <Building2 className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{nm(o)}</span>
                      <span className="block text-xs text-muted">
                        {t(`kind_${o.kind}` as TKey)} · {o.upazilaId ? areaName(areas.find((a) => a.id === o.upazilaId), lang) : t("whole_constituency")} · {t("officers_count", { n: people.length })}
                      </span>
                    </span>
                    {!o.active && (
                      <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-line px-1.5 py-0.5 text-xs text-muted">
                        <span className="h-[9px] w-[9px] rounded-[1px] bg-muted/40 shrink-0" aria-hidden="true" />
                        {t("inactive")}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="space-y-5 border-t border-line p-4">
                    <StakeholderForm value={{ id: o.id, nameEn: o.nameEn, nameBn: o.nameBn, kind: o.kind, upazilaId: o.upazilaId }} upazilas={upazilas} submit={t("save_changes")} />
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">{t("officers")}</h3>
                      {people.length === 0 ? (
                        <p className="text-sm text-muted">{t("no_officers_yet")}</p>
                      ) : (
                        <ul className="divide-y divide-line">
                          {people.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{p.name}</span>
                                <span className="block truncate text-xs text-muted">{p.officeTitle ?? p.email}</span>
                              </span>
                              <RevokeButton userId={p.id} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <ToggleActive id={o.id} active={o.active} />
                  </div>
                </details>
              );
            })
          )}
        </section>

        <div className="space-y-6">
          <section className="card rounded-[4px] shadow-none p-5" aria-labelledby="add-h">
            <h2 id="add-h" className="mb-4 text-lg font-semibold">{t("add_office")}</h2>
            <StakeholderForm upazilas={upazilas} submit={t("add_office_btn")} />
          </section>
          <section className="card rounded-[4px] shadow-none p-5" aria-labelledby="appoint-h">
            <h2 id="appoint-h" className="text-lg font-semibold">{t("appoint_officer")}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">{t("appoint_officer_hint")}</p>
            <AppointForm offices={active.map((o) => ({ id: o.id, name: nm(o) }))} />
          </section>
        </div>
      </div>
    </div>
  );
}
