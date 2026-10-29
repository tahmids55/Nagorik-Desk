import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { getSavedIssueIds } from "./bookmarks";
import { comments, issueMedia, issueUpdates, issues, media, stakeholders, updateMedia, users, votes } from "../db/schema";
import { LIMITS, URGENT_UPVOTES, type Role, type Sort } from "@/lib/constants";
import { boxAround, haversineMeters } from "@/lib/geo/geo";
import type { CommentDTO, IssueCardDTO, MapPinDTO, TimelineEntryDTO, VoteValue } from "@/lib/types";

export type StatusFilter = "open" | "progress" | "resolved" | "rejected" | "overdue";

export type FeedFilters = {
  q?: string;
  area?: string;
  category?: string;
  status?: StatusFilter;
  /** Only issues the community marked urgent (10+ upvotes) */
  urgent?: boolean;
  sort?: Sort;
  page?: number;
  authorId?: string;
  stakeholderId?: string;
  /** Include posts hidden by moderators (admin / author views only) */
  includeHidden?: boolean;
  /** Include anonymous posts when listing by author (only for the author themself) */
  includeAnonymousOfAuthor?: boolean;
  /** Only issues this user upvoted (callers must make sure it is the viewer) */
  votedBy?: string;
  ids?: string[];
};

export type Viewer = { id: string; role: Role } | null;

const ACTIVE_STATUSES = ["assigned", "in_progress"] as const;

const statusClause = (s: StatusFilter): SQL | undefined => {
  switch (s) {
    case "open":
      return inArray(issues.status, ["open", "under_review"]);
    case "progress":
      return inArray(issues.status, [...ACTIVE_STATUSES]);
    case "resolved":
      return eq(issues.status, "resolved");
    case "rejected":
      return eq(issues.status, "rejected");
    case "overdue":
      return and(inArray(issues.status, [...ACTIVE_STATUSES]), lte(issues.dueAt, sql`now()`));
  }
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

function whereFor(f: FeedFilters, viewer: Viewer): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (!f.includeHidden) c.push(isNull(issues.hiddenAt));
  if (f.ids) c.push(inArray(issues.id, f.ids));
  if (f.area) c.push(or(eq(issues.upazilaId, f.area), eq(issues.unionId, f.area)));
  if (f.category) c.push(eq(issues.categoryId, f.category));
  if (f.status) c.push(statusClause(f.status));
  if (f.urgent) c.push(gte(issues.upvotes, URGENT_UPVOTES));
  if (f.stakeholderId) c.push(eq(issues.stakeholderId, f.stakeholderId));
  if (f.votedBy && viewer?.id === f.votedBy) {
    c.push(sql`exists (select 1 from ${votes} v where v.issue_id = ${issues.id} and v.user_id = ${f.votedBy} and v.value = 1)`);
  }
  if (f.authorId) {
    c.push(eq(issues.authorId, f.authorId));
    if (!(f.includeAnonymousOfAuthor && viewer?.id === f.authorId)) c.push(eq(issues.anonymous, false));
  }
  if (f.q?.trim()) {
    const like = `%${escapeLike(f.q.trim().slice(0, 80))}%`;
    c.push(or(ilike(issues.title, like), ilike(issues.body, like)));
  }
  return and(...c);
}

function orderFor(sort: Sort): SQL[] {
  switch (sort) {
    case "new":
      return [desc(issues.createdAt)];
    case "top":
      return [desc(issues.score), desc(issues.createdAt)];
    case "hot":
    default:
      // Reddit-style gravity: votes matter, but older posts sink. MP priorities and urgent reports get a boost.
      return [
        desc(
          sql`(${issues.score} + case when ${issues.mpPriority} then 5 else 0 end + case when ${issues.isUrgent} then 2 else 0 end)::float
            / power(extract(epoch from (now() - ${issues.createdAt})) / 3600.0 + 2, 1.4)`,
        ),
        desc(issues.createdAt),
      ];
  }
}

type Row = {
  issue: typeof issues.$inferSelect;
  author: { id: string; name: string; avatarMediaId: string | null; role: string; deletedAt: Date | null };
  stakeholder: { id: string; nameEn: string; nameBn: string | null } | null;
};

async function hydrate(rows: Row[], viewer: Viewer): Promise<IssueCardDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.issue.id);

  const [imgRows, voteRows, savedIds] = await Promise.all([
    db()
      .select({ issueId: issueMedia.issueId, mediaId: issueMedia.mediaId })
      .from(issueMedia)
      .where(inArray(issueMedia.issueId, ids))
      .orderBy(asc(issueMedia.position)),
    viewer
      ? db()
          .select({ issueId: votes.issueId, value: votes.value })
          .from(votes)
          .where(and(eq(votes.userId, viewer.id), inArray(votes.issueId, ids)))
      : Promise.resolve([] as { issueId: string; value: number }[]),
    viewer ? getSavedIssueIds(viewer.id, ids) : Promise.resolve(new Set<string>()),
  ]);

  const imgs = new Map<string, string[]>();
  for (const r of imgRows) imgs.set(r.issueId, [...(imgs.get(r.issueId) ?? []), r.mediaId]);
  const myVotes = new Map(voteRows.map((v) => [v.issueId, v.value as VoteValue]));
  const staffView = viewer?.role === "office" || viewer?.role === "admin";
  const now = Date.now();

  return rows.map(({ issue: i, author, stakeholder }) => {
    const mine = viewer?.id === i.authorId;
    const reveal = !i.anonymous || mine || staffView;
    return {
      id: i.id,
      seq: i.seq,
      title: i.title,
      body: i.body,
      categoryId: i.categoryId,
      upazilaId: i.upazilaId,
      unionId: i.unionId,
      lat: i.lat,
      lng: i.lng,
      precise: i.precise,
      landmark: i.landmark,
      isUrgent: i.upvotes >= URGENT_UPVOTES,
      status: i.status as IssueCardDTO["status"],
      stakeholder: stakeholder ? { id: stakeholder.id, nameEn: stakeholder.nameEn, nameBn: stakeholder.nameBn } : null,
      dueAt: i.dueAt?.toISOString() ?? null,
      overdue: !!i.dueAt && i.dueAt.getTime() < now && (i.status === "assigned" || i.status === "in_progress"),
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
      confirmed: i.confirmedAt !== null,
      mpPriority: i.mpPriority,
      mpCommitment: i.mpCommitment,
      mpTargetDate: i.mpTargetDate,
      upvotes: i.upvotes,
      downvotes: i.downvotes,
      score: i.score,
      commentCount: i.commentCount,
      createdAt: i.createdAt.toISOString(),
      author: {
        id: reveal && !author.deletedAt ? author.id : null,
        name: author.deletedAt ? "" : reveal ? author.name : "",
        avatarMediaId: reveal && !author.deletedAt ? author.avatarMediaId : null,
        role: reveal && !author.deletedAt ? (author.role as Role) : null,
        anonymous: i.anonymous || !!author.deletedAt,
      },
      isMine: mine,
      myVote: myVotes.get(i.id) ?? 0,
      saved: savedIds.has(i.id),
      images: imgs.get(i.id) ?? [],
      hidden: i.hiddenAt !== null,
    };
  });
}

const baseSelect = () =>
  db()
    .select({
      issue: issues,
      author: {
        id: users.id,
        name: users.name,
        avatarMediaId: users.avatarMediaId,
        role: users.role,
        deletedAt: users.deletedAt,
      },
      stakeholder: { id: stakeholders.id, nameEn: stakeholders.nameEn, nameBn: stakeholders.nameBn },
    })
    .from(issues)
    .innerJoin(users, eq(users.id, issues.authorId))
    .leftJoin(stakeholders, eq(stakeholders.id, issues.stakeholderId));

export async function listIssues(f: FeedFilters, viewer: Viewer): Promise<{ items: IssueCardDTO[]; hasMore: boolean }> {
  const page = Math.max(1, Math.min(f.page ?? 1, 500));
  const size = LIMITS.pageSize;
  const rows = await baseSelect()
    .where(whereFor(f, viewer))
    .orderBy(...orderFor(f.sort ?? "hot"))
    .limit(size + 1)
    .offset((page - 1) * size);
  const items = await hydrate(rows.slice(0, size), viewer);
  return { items, hasMore: rows.length > size };
}

/** Single issue. Hidden issues are only visible to their author and to admins. */
export async function getIssue(id: string, viewer: Viewer): Promise<IssueCardDTO | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await baseSelect().where(eq(issues.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.issue.hiddenAt && !(viewer && (viewer.id === row.issue.authorId || viewer.role === "admin"))) return null;
  const [dto] = await hydrate(rows, viewer);
  return dto ?? null;
}

export async function getTimeline(issueId: string): Promise<TimelineEntryDTO[]> {
  const joined = await db()
    .select({ u: issueUpdates, sNameEn: stakeholders.nameEn, sNameBn: stakeholders.nameBn })
    .from(issueUpdates)
    .leftJoin(stakeholders, eq(stakeholders.id, issueUpdates.stakeholderId))
    .where(eq(issueUpdates.issueId, issueId))
    .orderBy(asc(issueUpdates.createdAt));
  const rows = joined.map((j) => ({ ...j.u, sNameEn: j.sNameEn, sNameBn: j.sNameBn }));
  if (rows.length === 0) return [];
  const media = await db()
    .select({ updateId: updateMedia.updateId, mediaId: updateMedia.mediaId })
    .from(updateMedia)
    .where(
      inArray(
        updateMedia.updateId,
        rows.map((r) => r.id),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    actorRole: r.actorRole,
    actorLabel: r.actorLabel,
    stakeholder: r.sNameEn ? { nameEn: r.sNameEn, nameBn: r.sNameBn } : null,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    body: r.body,
    meta: r.meta,
    createdAt: r.createdAt.toISOString(),
    images: media.filter((m) => m.updateId === r.id).map((m) => m.mediaId),
  }));
}

export async function getComments(issueId: string, viewerId: string | null): Promise<CommentDTO[]> {
  const rows = await db()
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: users.id,
      name: users.name,
      avatar: users.avatarMediaId,
      role: users.role,
      deletedAt: users.deletedAt,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(eq(comments.issueId, issueId), isNull(comments.hiddenAt)))
    .orderBy(asc(comments.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.authorId, name: r.deletedAt ? "" : r.name, avatarMediaId: r.deletedAt ? null : r.avatar, role: r.role as Role },
    mine: r.authorId === viewerId,
  }));
}

export async function getMapPins(f: Pick<FeedFilters, "category" | "status" | "area">): Promise<MapPinDTO[]> {
  const rows = await db()
    .select({
      id: issues.id,
      title: issues.title,
      lat: issues.lat,
      lng: issues.lng,
      precise: issues.precise,
      status: issues.status,
      categoryId: issues.categoryId,
      upazilaId: issues.upazilaId,
      score: issues.score,
      upvotes: issues.upvotes,
      isUrgent: issues.isUrgent,
      dueAt: issues.dueAt,
      createdAt: issues.createdAt,
    })
    .from(issues)
    .where(whereFor({ ...f, status: f.status }, null))
    .orderBy(desc(issues.createdAt))
    .limit(2000);
  const firstImage = new Map<string, string>();
  if (rows.length > 0) {
    // Lowest-position image per issue in a single query (DISTINCT ON), no N+1.
    const imgs = await db()
      .selectDistinctOn([issueMedia.issueId], { issueId: issueMedia.issueId, mediaId: media.id, thumbUrl: media.thumbUrl })
      .from(issueMedia)
      .innerJoin(media, eq(media.id, issueMedia.mediaId))
      .where(inArray(issueMedia.issueId, rows.map((r) => r.id)))
      .orderBy(issueMedia.issueId, asc(issueMedia.position));
    for (const i of imgs) firstImage.set(i.issueId, i.thumbUrl ?? `/api/media/${i.mediaId}?s=thumb`);
  }
  const now = Date.now();
  return rows.map((r) => ({
    imageUrl: firstImage.get(r.id) ?? null,
    id: r.id,
    title: r.title,
    lat: r.lat,
    lng: r.lng,
    precise: r.precise,
    status: r.status as MapPinDTO["status"],
    categoryId: r.categoryId,
    upazilaId: r.upazilaId,
    score: r.score,
    isUrgent: r.upvotes >= URGENT_UPVOTES,
    overdue: !!r.dueAt && r.dueAt.getTime() < now && (r.status === "assigned" || r.status === "in_progress"),
    createdAt: r.createdAt.toISOString(),
  }));
}

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2),
  );

export function titleSimilarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export type SimilarDTO = { id: string; title: string; status: string; distanceM: number; score: number };

/** Possible duplicates: close by (within `radiusM`) and the same category or a similar title. */
export async function findSimilar(
  p: { lat: number; lng: number; categoryId: string; title: string },
  radiusM = 300,
  excludeId?: string,
): Promise<SimilarDTO[]> {
  const box = boxAround(p, radiusM);
  const rows = await db()
    .select({ id: issues.id, title: issues.title, status: issues.status, lat: issues.lat, lng: issues.lng, categoryId: issues.categoryId, score: issues.score })
    .from(issues)
    .where(
      and(
        isNull(issues.hiddenAt),
        inArray(issues.status, ["open", "under_review", "assigned", "in_progress"]),
        gte(issues.lat, box.minLat),
        lte(issues.lat, box.maxLat),
        gte(issues.lng, box.minLng),
        lte(issues.lng, box.maxLng),
      ),
    )
    .limit(50);
  return rows
    .filter((r) => r.id !== excludeId)
    .map((r) => ({
      r,
      d: haversineMeters(p, r),
      sim: titleSimilarity(p.title, r.title),
    }))
    .filter(({ r, d, sim }) => d <= radiusM && (r.categoryId === p.categoryId || sim >= 0.3))
    .sort((a, b) => b.sim - a.sim || a.d - b.d)
    .slice(0, 3)
    .map(({ r, d }) => ({ id: r.id, title: r.title, status: r.status, distanceM: Math.round(d), score: r.score }));
}
