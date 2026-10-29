import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db/client";

export type ContributorDTO = {
  id: string;
  name: string;
  avatarMediaId: string | null;
  issues: number;
  resolved: number;
  votes: number;
};

/**
 * Top reporters of the last 30 days, ranked by upvotes received (tie-break: number of reports).
 * Hidden and anonymous issues never count, and deleted/suspended accounts are excluded so an
 * anonymous reporter can never be identified through this list.
 */
export async function getTopContributors(limit = 5): Promise<ContributorDTO[]> {
  const cap = Math.min(Math.max(Math.trunc(limit) || 5, 1), 50);
  const res = await db().execute(sql`
    select
      u.id as id,
      u.name as name,
      u.avatar_media_id as avatar_media_id,
      count(*)::int as issues,
      (count(*) filter (where i.status = 'resolved'))::int as resolved,
      coalesce(sum(i.upvotes), 0)::int as votes
    from nagorik_pg.issues i
    join nagorik_pg.users u on u.id = i.author_id
    where i.hidden_at is null
      and i.anonymous = false
      and i.created_at > now() - interval '30 days'
      and u.deleted_at is null
      and u.status = 'active'
    group by u.id, u.name, u.avatar_media_id
    having count(*) >= 1
    order by votes desc, issues desc, u.name asc, u.id asc
    limit ${cap}`);
  return res.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    avatarMediaId: r.avatar_media_id === null || r.avatar_media_id === undefined ? null : String(r.avatar_media_id),
    issues: Number(r.issues),
    resolved: Number(r.resolved),
    votes: Number(r.votes),
  }));
}
