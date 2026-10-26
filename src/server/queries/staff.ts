import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { issueUpdates, issues, stakeholders, users } from "../db/schema";

export type StaffRow = {
  id: string;
  seq: number;
  title: string;
  status: string;
  upazilaId: string;
  categoryId: string;
  isUrgent: boolean;
  mpPriority: boolean;
  score: number;
  commentCount: number;
  createdAt: string;
  dueAt: string | null;
  overdue: boolean;
  stakeholderId: string | null;
  stakeholderNameEn: string | null;
  stakeholderNameBn: string | null;
};

const cols = {
  id: issues.id,
  seq: issues.seq,
  title: issues.title,
  status: issues.status,
  upazilaId: issues.upazilaId,
  categoryId: issues.categoryId,
  isUrgent: issues.isUrgent,
  mpPriority: issues.mpPriority,
  score: issues.score,
  commentCount: issues.commentCount,
  createdAt: issues.createdAt,
  dueAt: issues.dueAt,
  stakeholderId: issues.stakeholderId,
  stakeholderNameEn: stakeholders.nameEn,
  stakeholderNameBn: stakeholders.nameBn,
};

const map = (r: Record<string, unknown> & { createdAt: Date; dueAt: Date | null; status: string }): StaffRow => ({
  ...(r as unknown as StaffRow),
  createdAt: r.createdAt.toISOString(),
  dueAt: r.dueAt?.toISOString() ?? null,
  overdue: !!r.dueAt && r.dueAt.getTime() < Date.now() && (r.status === "assigned" || r.status === "in_progress"),
});

const base = () => db().select(cols).from(issues).leftJoin(stakeholders, eq(stakeholders.id, issues.stakeholderId));

/** Open reports nobody has assigned yet: urgent first, then by public support. */
export async function triageQueue(limit = 10): Promise<StaffRow[]> {
  const rows = await base()
    .where(and(isNull(issues.hiddenAt), inArray(issues.status, ["open", "under_review"])))
    .orderBy(desc(issues.isUrgent), desc(issues.score), asc(issues.createdAt))
    .limit(limit);
  return rows.map(map);
}

export async function overdueIssues(limit = 10): Promise<StaffRow[]> {
  const rows = await base()
    .where(and(isNull(issues.hiddenAt), inArray(issues.status, ["assigned", "in_progress"]), lte(issues.dueAt, sql`now()`)))
    .orderBy(asc(issues.dueAt))
    .limit(limit);
  return rows.map(map);
}

/** Issues whose most recent extension event is an unanswered request. */
export async function pendingExtensions(): Promise<StaffRow[]> {
  const rows = await base()
    .where(
      and(
        isNull(issues.hiddenAt),
        sql`(select u.kind from ${issueUpdates} u where u.issue_id = ${issues.id} and u.kind like 'extension\\_%' order by u.created_at desc limit 1) = 'extension_requested'`,
      ),
    )
    .orderBy(asc(issues.dueAt))
    .limit(20);
  return rows.map(map);
}

export type StaffFilters = { status?: string; upazila?: string; stakeholder?: string; q?: string; page?: number; overdue?: boolean };
const PAGE = 25;

export async function staffIssues(f: StaffFilters): Promise<{ rows: StaffRow[]; hasMore: boolean }> {
  const c: (SQL | undefined)[] = [isNull(issues.hiddenAt)];
  if (f.status && ["open", "under_review", "assigned", "in_progress", "resolved", "rejected"].includes(f.status)) c.push(eq(issues.status, f.status));
  if (f.status === "unassigned") c.push(inArray(issues.status, ["open", "under_review"]));
  if (f.upazila) c.push(eq(issues.upazilaId, f.upazila));
  if (f.stakeholder === "none") c.push(isNull(issues.stakeholderId));
  else if (f.stakeholder) c.push(eq(issues.stakeholderId, f.stakeholder));
  if (f.overdue) c.push(and(inArray(issues.status, ["assigned", "in_progress"]), lte(issues.dueAt, sql`now()`)));
  if (f.q?.trim()) c.push(or(ilike(issues.title, `%${f.q.trim().replace(/[\\%_]/g, "\\$&").slice(0, 80)}%`)));
  const page = Math.max(1, Math.min(f.page ?? 1, 200));
  const rows = await base()
    .where(and(...c))
    .orderBy(desc(issues.isUrgent), desc(issues.createdAt))
    .limit(PAGE + 1)
    .offset((page - 1) * PAGE);
  return { rows: rows.slice(0, PAGE).map(map), hasMore: rows.length > PAGE };
}

export async function assignmentsFor(stakeholderId: string, tab: "todo" | "active" | "done"): Promise<StaffRow[]> {
  const statuses = tab === "todo" ? ["assigned"] : tab === "active" ? ["in_progress"] : ["resolved"];
  const rows = await base()
    .where(and(eq(issues.stakeholderId, stakeholderId), isNull(issues.hiddenAt), inArray(issues.status, statuses)))
    .orderBy(asc(issues.dueAt), desc(issues.isUrgent))
    .limit(100);
  return rows.map(map);
}

export async function assignmentCounts(stakeholderId: string): Promise<{ todo: number; active: number; done: number; overdue: number }> {
  const [r] = await db()
    .select({
      todo: sql<number>`(count(*) filter (where ${issues.status} = 'assigned'))::int`,
      active: sql<number>`(count(*) filter (where ${issues.status} = 'in_progress'))::int`,
      done: sql<number>`(count(*) filter (where ${issues.status} = 'resolved'))::int`,
      overdue: sql<number>`(count(*) filter (where ${issues.status} in ('assigned','in_progress') and ${issues.dueAt} < now()))::int`,
    })
    .from(issues)
    .where(and(eq(issues.stakeholderId, stakeholderId), isNull(issues.hiddenAt)));
  return r ?? { todo: 0, active: 0, done: 0, overdue: 0 };
}

export type AuthorityUser = { id: string; name: string; email: string; officeTitle: string | null; stakeholderId: string };

export async function authorityUsers(): Promise<AuthorityUser[]> {
  const rows = await db()
    .select({ id: users.id, name: users.name, email: users.email, officeTitle: users.officeTitle, stakeholderId: users.stakeholderId })
    .from(users)
    .where(and(eq(users.role, "authority"), eq(users.status, "active")))
    .orderBy(asc(users.name));
  return rows.filter((r): r is AuthorityUser => r.stakeholderId !== null);
}

export const STAFF_PAGE_SIZE = PAGE;
