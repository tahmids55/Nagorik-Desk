import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalNav } from "@/components/staff/PortalNav";
import { getT } from "@/i18n/server";
import { requirePermission } from "@/server/auth/guards";

export const metadata: Metadata = { title: { default: "MP office", template: "%s · MP office" }, robots: { index: false, follow: false } };

export default async function OfficeLayout({ children }: { children: ReactNode }) {
  await requirePermission("office:view", "/office");
  const { t } = await getT();
  return (
    <>
      <PortalNav
        title={t("portal_office")}
        links={[
          { href: "/office", label: t("office_dashboard"), exact: true },
          { href: "/office/issues", label: t("office_issues") },
          { href: "/office/stakeholders", label: t("office_stakeholders") },
        ]}
      />
      <div className="mx-auto max-w-[1180px] px-3 py-6 sm:px-4">{children}</div>
    </>
  );
}
