"use client";

import { Briefcase, Shield, Wrench } from "lucide-react";
import { useI18n } from "@/i18n/client";

const ROLES = {
  office: [Briefcase, "role_office"],
  authority: [Wrench, "role_authority"],
  admin: [Shield, "role_admin"],
} as const;

/** Marks staff accounts in comments and lists. Citizens get no badge. */
export function RoleBadge({ role }: { role: string | null | undefined }) {
  const { t } = useI18n();
  const m = role ? ROLES[role as keyof typeof ROLES] : undefined;
  if (!m) return null;
  const [Icon, key] = m;
  return (
    <span className="inline-flex items-center gap-1 rounded-[2px] border border-brand/40 px-1.5 py-0.5 text-[10px] font-medium leading-none text-brand">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(key)}
    </span>
  );
}
