import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalNav } from "@/components/staff/PortalNav";
import { getT } from "@/i18n/server";
import { requirePermission } from "@/server/auth/guards";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePermission("users:manage", "/admin");
  const { t } = await getT();
  return (
    <>
      <PortalNav
        title={t("portal_admin")}
        links={[
          { href: "/admin", label: t("admin_overview"), exact: true },
          { href: "/admin/users", label: t("admin_users") },
          { href: "/admin/moderation", label: t("admin_moderation") },
          { href: "/admin/audit", label: t("admin_audit") },
        ]}
      />
      <div className="mx-auto max-w-[1180px] px-3 py-6 sm:px-4">{children}</div>
    </>
  );
}
