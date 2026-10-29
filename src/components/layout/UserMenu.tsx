"use client";

import { Bookmark, Briefcase, ChevronDown, LogOut, Settings, Shield, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useI18n } from "@/i18n/client";
import type { Role } from "@/lib/constants";
import { logout } from "@/server/actions/auth";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu({ id, name, avatarMediaId, role }: { id: string; name: string; avatarMediaId: string | null; role: Role }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left text-sm font-normal hover:bg-neutral-fill";
  const portal =
    role === "office" ? { href: "/office", label: t("portal_office"), icon: Briefcase }
    : role === "authority" ? { href: "/authority", label: t("portal_authority"), icon: Wrench }
    : role === "admin" ? { href: "/admin", label: t("portal_admin"), icon: Shield }
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("account_menu")}
        className="flex items-center gap-1 rounded-[3px] p-0.5 hover:bg-neutral-fill"
      >
        <Avatar name={name} mediaId={avatarMediaId} size="sm" />
        <ChevronDown className="mr-1 hidden h-4 w-4 text-muted sm:block" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[4px] border border-line bg-surface p-2 shadow-popover">
          <Link href={`/u/${id}`} className="mb-1 flex items-center gap-3 rounded-[3px] p-2 hover:bg-neutral-fill" onClick={() => setOpen(false)}>
            <Avatar name={name} mediaId={avatarMediaId} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block text-xs text-muted">{t("view_profile")}</span>
            </span>
          </Link>
          <hr className="my-1 border-line" />
          {portal && (
            <Link href={portal.href} className={item} onClick={() => setOpen(false)}>
              <portal.icon className="h-[18px] w-[18px] text-brand" aria-hidden="true" />
              {portal.label}
            </Link>
          )}
          <Link href={`/u/${id}`} className={item} onClick={() => setOpen(false)}>
            <User className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("my_profile")}
          </Link>
          <Link href="/saved" className={item} onClick={() => setOpen(false)}>
            <Bookmark className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("nav_saved")}
          </Link>
          <Link href="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("settings")}
          </Link>
          <LangToggle variant="row" />
          <ThemeToggle variant="row" />
          <hr className="my-1 border-line" />
          <div className="flex flex-wrap items-center gap-x-2 px-3 py-1.5 text-xs text-muted">
            <Link href="/about" className="hover:text-ink hover:underline" onClick={() => setOpen(false)}>
              {t("about")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-ink hover:underline" onClick={() => setOpen(false)}>
              {t("terms")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-ink hover:underline" onClick={() => setOpen(false)}>
              {t("privacy")}
            </Link>
          </div>
          <hr className="my-1 border-line" />
          <form action={logout}>
            <button type="submit" className={item}>
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("sign_out")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
