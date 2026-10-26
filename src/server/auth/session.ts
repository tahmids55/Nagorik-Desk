import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";
import { randomToken, sha256 } from "../crypto";
import { STAFF_ROLES, type Lang, type Role } from "@/lib/constants";

const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProd ? "__Host-ngk_session" : "ngk_session";

const DAY = 86_400_000;
/** Citizens stay signed in for a long time; staff sessions are short. */
const POLICY = {
  citizen: { idleMs: 30 * DAY, absoluteMs: 90 * DAY },
  staff: { idleMs: 30 * 60_000, absoluteMs: 12 * 60 * 60_000 },
};
const policyFor = (role: string) => (STAFF_ROLES.includes(role as Role) ? POLICY.staff : POLICY.citizen);

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  lang: Lang;
  upazilaId: string | null;
  unionId: string | null;
  stakeholderId: string | null;
  officeTitle: string | null;
  avatarMediaId: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: Date;
};

export type Session = { id: string; user: SessionUser; mfaVerified: boolean };

export async function createSession(userId: string, role: string, opts: { mfaVerified: boolean }): Promise<void> {
  const token = randomToken(32);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  const pol = policyFor(role);
  await db().insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + pol.absoluteMs),
    mfaVerifiedAt: opts.mfaVerified ? new Date() : null,
    userAgent: ua,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(pol.absoluteMs / 1000),
  });
}

/** Resolve the current session (cached for the duration of one request). */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;

  const [row] = await db()
    .select({
      sid: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      mfaVerifiedAt: sessions.mfaVerifiedAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, sql`now()`)));
  if (!row) return null;

  const u = row.user;
  if (u.status !== "active") return null;
  const pol = policyFor(u.role);
  if (Date.now() - row.lastUsedAt.getTime() > pol.idleMs) {
    await db().delete(sessions).where(eq(sessions.id, row.sid));
    return null;
  }
  // Touch at most once a minute.
  if (Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db().update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, row.sid));
  }

  return {
    id: row.sid,
    mfaVerified: row.mfaVerifiedAt !== null,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      lang: u.lang as Lang,
      upazilaId: u.upazilaId,
      unionId: u.unionId,
      stakeholderId: u.stakeholderId,
      officeTitle: u.officeTitle,
      avatarMediaId: u.avatarMediaId,
      emailVerified: u.emailVerifiedAt !== null,
      totpEnabled: u.totpEnabledAt !== null,
      createdAt: u.createdAt,
    },
  };
});

export async function markMfaVerified(sessionId: string): Promise<void> {
  await db().update(sessions).set({ mfaVerifiedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db()
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), sql`${sessions.id} <> ${exceptSessionId}`) : eq(sessions.userId, userId));
}
