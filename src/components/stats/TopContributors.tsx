import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { getT } from "@/i18n/server";
import { formatNumber } from "@/i18n/translate";
import { getTopContributors } from "@/server/queries/leaderboard";

/** Most supported reporters of the last 30 days (anonymous and hidden reports never count). */
export async function TopContributors({ limit = 5 }: { limit?: number }) {
  const [{ t, lang }, contributors] = await Promise.all([getT(), getTopContributors(limit).catch(() => [])]);
  const n = (v: number) => formatNumber(v, lang);
  if (contributors.length === 0) return <p className="text-sm text-muted">{t("contributors_empty")}</p>;
  return (
    <ol className="space-y-1">
      {contributors.map((c, i) => (
        <li key={c.id} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-center text-xs font-medium text-muted">{n(i + 1)}</span>
          <Link href={`/u/${c.id}`} className="-mx-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-[3px] px-1 py-1 hover:bg-neutral-fill">
            <Avatar name={c.name} mediaId={c.avatarMediaId} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{c.name}</span>
              <span className="block truncate text-xs text-muted">{t("contributor_stats", { issues: n(c.issues), resolved: n(c.resolved), votes: n(c.votes) })}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
