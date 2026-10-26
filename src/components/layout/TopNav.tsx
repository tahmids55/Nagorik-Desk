import { Plus } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getSession } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notify";
import { getT } from "@/i18n/server";
import { LangToggle } from "./LangToggle";
import { Logo } from "./Logo";
import { NavTabs } from "./NavTabs";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export async function TopNav() {
  const [session, { t }] = await Promise.all([getSession(), getT()]);
  const unread = session ? await unreadCount(session.user.id).catch(() => 0) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 sm:px-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center">
          <Logo />
        </div>
        <div className="h-full justify-self-center">
          <NavTabs />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          {session ? (
            <>
              <Link href="/new" className="btn-primary btn-sm hidden md:inline-flex">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("report_issue")}
              </Link>
              <NotificationBell initialUnread={unread} />
              <ThemeToggle className="hidden md:inline-flex" />
              <UserMenu id={session.user.id} name={session.user.name} avatarMediaId={session.user.avatarMediaId} role={session.user.role} />
            </>
          ) : (
            <>
              <LangToggle />
              <ThemeToggle />
              <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                {t("sign_in")}
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                {t("join")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
