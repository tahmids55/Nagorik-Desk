import "server-only";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { rateLimits } from "../db/schema";
import { sha256 } from "../crypto";

export type LimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Fixed-window counter in Postgres (works across serverless instances, no Redis needed).
 * One atomic upsert per call. `ok` is false once `limit` hits in `windowSec` are exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<LimitResult> {
  const interval = sql`make_interval(secs => ${windowSec})`;
  const [row] = await db()
    .insert(rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - ${interval} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - ${interval} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({
      count: rateLimits.count,
      retry: sql<number>`ceil(extract(epoch from (${rateLimits.windowStart} + ${interval} - now())))::int`,
    });
  const ok = (row?.count ?? 1) <= limit;
  return { ok, retryAfterSec: ok ? 0 : Math.max(1, row?.retry ?? windowSec) };
}

/** Sign-in protection: after `limit` failures inside `windowSec`, lock the key for `lockSec`. */
export async function lockStatus(key: string): Promise<LimitResult> {
  const [row] = await db()
    .select({ retry: sql<number>`ceil(extract(epoch from (${rateLimits.lockedUntil} - now())))::int` })
    .from(rateLimits)
    .where(eq(rateLimits.key, key));
  const retry = row?.retry ?? 0;
  return retry > 0 ? { ok: false, retryAfterSec: retry } : { ok: true, retryAfterSec: 0 };
}

export async function recordFailure(key: string, limit = 5, windowSec = 600, lockSec = 900): Promise<void> {
  const res = await rateLimit(key, limit - 1, windowSec); // ok=false once the limit-th failure is recorded
  if (!res.ok) {
    await db()
      .update(rateLimits)
      .set({ lockedUntil: sql`now() + make_interval(secs => ${lockSec})`, count: 0 })
      .where(eq(rateLimits.key, key));
  }
}

export async function clearFailures(key: string): Promise<void> {
  await db().delete(rateLimits).where(eq(rateLimits.key, key));
}

/** Best-effort client address. Behind a trusted proxy (Vercel, Caddy, nginx) the first XFF entry is the client. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || h.get("x-real-ip") || "unknown";
}

/** Addresses are hashed before they are stored in rate-limit keys. */
export async function ipKey(): Promise<string> {
  return sha256(await clientIp()).slice(0, 16);
}
