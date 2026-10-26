import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { verificationCodes } from "../db/schema";
import { hmac, randomCode, safeEqual } from "../crypto";

type Purpose = "email_verify" | "password_reset" | "phone_verify";
const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const hashFor = (code: string, userId: string, purpose: Purpose) => hmac(`${purpose}:${userId}:${code}`);

/** Creates a fresh 6-digit code; any older unused code for the same purpose stops working. Only a hash is stored. */
export async function issueCode(userId: string, purpose: Purpose, target: string): Promise<string> {
  const code = randomCode(6);
  await db().transaction(async (tx) => {
    await tx
      .update(verificationCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.consumedAt)));
    await tx.insert(verificationCodes).values({
      userId,
      purpose,
      target,
      codeHash: hashFor(code, userId, purpose),
      expiresAt: new Date(Date.now() + TTL_MS),
    });
  });
  return code;
}

export type CodeCheck = { ok: true; target: string } | { ok: false; reason: "invalid" | "expired" | "locked" };

export async function consumeCode(userId: string, purpose: Purpose, code: string): Promise<CodeCheck> {
  const [row] = await db()
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.consumedAt)))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };

  if (!safeEqual(row.codeHash, hashFor(code.trim(), userId, purpose))) {
    await db()
      .update(verificationCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(verificationCodes.id, row.id));
    return { ok: false, reason: row.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "invalid" };
  }
  // Atomic single use
  const claimed = await db()
    .update(verificationCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(verificationCodes.id, row.id), isNull(verificationCodes.consumedAt), gt(verificationCodes.expiresAt, new Date())))
    .returning({ id: verificationCodes.id });
  return claimed.length ? { ok: true, target: row.target } : { ok: false, reason: "invalid" };
}
