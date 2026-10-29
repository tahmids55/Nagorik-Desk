import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/issue/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getT } from "@/i18n/server";
import { LIMITS } from "@/lib/constants";
import type { IssueCardDTO } from "@/lib/types";
import { requireUser } from "@/server/auth/guards";
import { listSavedIssueIds } from "@/server/queries/bookmarks";
import { decorate } from "@/server/queries/feed";
import { listIssues } from "@/server/queries/issues";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("saved_title"), robots: { index: false } };
}

/** How many saved issues the page shows at once (newest saved first). */
const MAX_SHOWN = 60;

const chunk = <T,>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

export default async function SavedPage() {
  const session = await requireUser("/saved");
  const { t, lang } = await getT();
  const viewer = { id: session.user.id, role: session.user.role };

  const ids = await listSavedIssueIds(viewer.id, MAX_SHOWN);

  // listIssues pages by LIMITS.pageSize, so ask for one page-sized group of ids at a time.
  const pages = await Promise.all(
    chunk(ids, LIMITS.pageSize).map((group) => listIssues({ ids: group, includeAnonymousOfAuthor: true }, viewer)),
  );
  const byId = new Map<string, IssueCardDTO>(pages.flatMap((p) => p.items).map((i) => [i.id, i]));
  // Hidden or removed issues simply drop out; the rest keep the order they were saved in.
  const ordered = ids.map((id) => byId.get(id)).filter((i): i is IssueCardDTO => !!i);
  const items = await decorate(ordered, lang);

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-4 px-3 pt-4 sm:px-4">
      <header>
        <h1 className="text-2xl font-semibold">{t("saved_title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("saved_intro")}</p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={t("saved_empty_title")}
          body={t("saved_empty_body")}
          action={
            <Link href="/" className="btn-secondary rounded-[3px]">
              {t("nav_home")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <PostCard key={item.id} item={item} signedIn />
          ))}
        </div>
      )}
    </div>
  );
}
