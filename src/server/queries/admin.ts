import "server-only";
import { and, count, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { auditLog, comments, flags, issues, stakeholders, users } from "../db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  statusReason: string | null;
  officeTitle: string | null;
  stakeholderId: string | null;
  stakeholderName: string | null;
  createdAt: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
};

const PAGE = 25;

export async function listUsers(f: { q?: string; role?: string; page?: number }): Promise<{ rows: AdminUserRow[]; hasMore: boolean }> {
  const c: (SQL | undefined)[] = [sql`${users.status} <> 'deleted'`];
  if (f.role && ["citizen", "authority", "office", "admin"].includes(f.role)) c.push(eq(users.role, f.role));
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[\\%_]/g, "\\$&").slice(0, 80)}%`;
    c.push(or(ilike(users.name, like), ilike(users.email, like)));
  }
  const page = Math.max(1, Math.min(f.page ?? 1, 200));
  const rows = await db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      statusReason: users.statusReason,
      officeTitle: users.officeTitle,
      stakeholderId: users.stakeholderId,
      stakeholderName: stakeholders.nameEn,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      totpEnabledAt: users.totpEnabledAt,
    })
    .from(users)
    .leftJoin(stakeholders, eq(stakeholders.id, users.stakeholderId))
    .where(and(...c))
    .orderBy(desc(users.createdAt))
    .limit(PAGE + 1)
    .offset((page - 1) * PAGE);
  return {
    rows: rows.slice(0, PAGE).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.status,
      statusReason: r.statusReason,
      officeTitle: r.officeTitle,
      stakeholderId: r.stakeholderId,
      stakeholderName: r.stakeholderName,
      createdAt: r.createdAt.toISOString(),
      emailVerified: r.emailVerifiedAt !== null,
      mfaEnabled: r.totpEnabledAt !== null,
    })),
    hasMore: rows.length > PAGE,
  };
}

export type FlagGroup = {
  targetType: "issue" | "comment";
  targetId: string;
  flagCount: number;
  reasons: string[];
  notes: string[];
  firstFlaggedAt: string;
  oneFlagId: string;
  preview: string;
  issueId: string | null;
  authorName: string | null;
  alreadyHidden: boolean;
};

/** Open flags grouped by target, most-flagged first. */
export async function flagQueue(): Promise<FlagGroup[]> {
  const groups = await db()
    .select({
      targetType: flags.targetType,
      targetId: flags.targetId,
      n: count(),
      reasons: sql<string[]>`array_agg(distinct ${flags.reason})`,
      notes: sql<string[]>`array_remove(array_agg(${flags.note}), null)`,
      first: sql<Date>`min(${flags.createdAt})`,
      oneId: sql<string>`(array_agg(${flags.id}))[1]`,
    })
    .from(flags)
    .where(eq(flags.status, "open"))
    .groupBy(flags.targetType, flags.targetId)
    .orderBy(desc(count()), sql`min(${flags.createdAt})`)
    .limit(50);

  const out: FlagGroup[] = [];
  for (const g of groups) {
    let preview = "";
    let issueId: string | null = null;
    let authorName: string | null = null;
    let hidden = false;
    if (g.targetType === "issue") {
      const [i] = await db().select({ title: issues.title, body: issues.body, hiddenAt: issues.hiddenAt, author: users.name }).from(issues).innerJoin(users, eq(users.id, issues.authorId)).where(eq(issues.id, g.targetId));
      preview = i ? `${i.title} — ${i.body}`.slice(0, 300) : "";
      issueId = g.targetId;
      authorName = i?.author ?? null;
      hidden = !!i?.hiddenAt;
    } else {
      const [c] = await db().select({ body: comments.body, issueId: comments.issueId, hiddenAt: comments.hiddenAt, author: users.name }).from(comments).innerJoin(users, eq(users.id, comments.authorId)).where(eq(comments.id, g.targetId));
      preview = c?.body.slice(0, 300) ?? "";
      issueId = c?.issueId ?? null;
      authorName = c?.author ?? null;
      hidden = !!c?.hiddenAt;
    }
    out.push({
      targetType: g.targetType as "issue" | "comment",
      targetId: g.targetId,
      flagCount: Number(g.n),
      reasons: g.reasons,
      notes: g.notes.slice(0, 3),
      firstFlaggedAt: new Date(g.first).toISOString(),
      oneFlagId: g.oneId,
      preview,
      issueId,
      authorName,
      alreadyHidden: hidden,
    });
  }
  return out;
}

export async function hiddenIssues(limit = 20) {
  return db()
    .select({ id: issues.id, title: issues.title, reason: issues.hiddenReason, hiddenAt: issues.hiddenAt })
    .from(issues)
    .where(isNotNull(issues.hiddenAt))
    .orderBy(desc(issues.hiddenAt))
    .limit(limit);
}

export type AuditRow = { id: number; actor: string | null; action: string; targetType: string | null; targetId: string | null; meta: Record<string, unknown> | null; createdAt: string };

export async function auditEntries(page = 1, action?: string): Promise<{ rows: AuditRow[]; hasMore: boolean }> {
  const size = 40;
  const rows = await db()
    .select({ a: auditLog, actorName: users.name })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(action ? ilike(auditLog.action, `${action.replace(/[\\%_]/g, "\\$&")}%`) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(size + 1)
    .offset((Math.max(1, Math.min(page, 500)) - 1) * size);
  return {
    rows: rows.slice(0, size).map(({ a, actorName }) => ({
      id: a.id,
      actor: actorName,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      meta: a.meta,
      createdAt: a.createdAt.toISOString(),
    })),
    hasMore: rows.length > size,
  };
}

export async function adminCounts() {
  const [u] = await db().select({ n: sql<number>`count(*)::int`, staff: sql<number>`(count(*) filter (where ${users.role} <> 'citizen'))::int`, suspended: sql<number>`(count(*) filter (where ${users.status} = 'suspended'))::int` }).from(users).where(sql`${users.status} <> 'deleted'`);
  const [f] = await db().select({ n: sql<number>`count(distinct (${flags.targetType}, ${flags.targetId}))::int` }).from(flags).where(eq(flags.status, "open"));
  return { users: u?.n ?? 0, staff: u?.staff ?? 0, suspended: u?.suspended ?? 0, openFlags: f?.n ?? 0 };
}
