"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { areas, users } from "../db/schema";
import { decrypt, hmac, sha256 } from "../crypto";
import { fakeVerify, checkPassword, hashPassword, verifyPassword } from "../auth/password";
import {
  SESSION_COOKIE,
  createSession,
  destroyAllSessions,
  destroyCurrentSession,
  getSession,
  markMfaVerified,
} from "../auth/session";
import { verifyTotp } from "../auth/totp";
import { clearFailures, ipKey, lockStatus, rateLimit, recordFailure } from "../security/rate-limit";
import { audit } from "../security/audit";
import { consumeCode, issueCode } from "../services/codes";
import { sendMail } from "../services/mail";
import { features } from "../env";
import { fail, ok, type ActionResult } from "@/lib/action";
import { LANGS, STAFF_ROLES, type Lang } from "@/lib/constants";
import { safeNext } from "@/lib/safe-next";
import { emailSchema, loginSchema, registerSchema } from "@/lib/validation";
import { LANG_COOKIE, getLang } from "@/i18n/server";
import { makeT } from "@/i18n/translate";
import { parseInput, isUniqueViolation } from "./_util";
import { z } from "zod";

export type FormState = ActionResult | null;

// ───────────── Register ─────────────

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await ipKey();
  const limited = await rateLimit(`register:${ip}`, 10, 3600);
  if (!limited.ok) return fail("rate_limited", { retryAfterSec: limited.retryAfterSec });

  const parsed = parseInput(registerSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const problem = checkPassword(d.password, { email: d.email, name: d.name });
  if (problem) return fail("validation", { fields: { password: `password_${problem}` } });

  const areaRows = await db().select().from(areas).where(eq(areas.id, d.upazilaId));
  const upazila = areaRows[0];
  if (!upazila || upazila.kind !== "upazila") return fail("validation", { fields: { upazilaId: "area_required" } });
  if (d.unionId) {
    const [u] = await db().select().from(areas).where(eq(areas.id, d.unionId));
    if (!u || u.kind !== "union" || u.parentId !== upazila.id) return fail("validation", { fields: { unionId: "area_invalid" } });
  }

  const lang = await getLang();
  let userId: string;
  try {
    const [row] = await db()
      .insert(users)
      .values({
        name: d.name,
        email: d.email,
        passwordHash: await hashPassword(d.password),
        upazilaId: upazila.id,
        unionId: d.unionId,
        lang,
      })
      .returning({ id: users.id });
    userId = row!.id;
  } catch (e) {
    if (isUniqueViolation(e)) return fail("email_taken", { fields: { email: "email_taken" } });
    throw e;
  }

  await audit({ actorId: userId, action: "user.register", targetType: "user", targetId: userId });
  await createSession(userId, "citizen", { mfaVerified: true });

  if (features().email) await sendVerificationEmail(userId, d.email, lang);

  redirect(safeNext(d.next));
}

// ───────────── Login ─────────────

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseInput(loginSchema, formData);
  if ("error" in parsed) return fail("invalid_credentials");
  const { email, password, next } = parsed.data;

  const ip = await ipKey();
  const pairKey = `login:${sha256(email).slice(0, 20)}:${ip}`;
  const acctKey = `login-acct:${sha256(email).slice(0, 20)}`;
  for (const key of [pairKey, acctKey]) {
    const lock = await lockStatus(key);
    if (!lock.ok) return fail("locked", { retryAfterSec: lock.retryAfterSec });
  }

  const [user] = await db().select().from(users).where(eq(users.email, email));
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await fakeVerify(password), false);
  if (!user || !valid) {
    await recordFailure(pairKey, 5, 600, 900);
    await recordFailure(acctKey, 20, 3600, 900);
    return fail("invalid_credentials");
  }

  await clearFailures(pairKey);
  if (user.status !== "active") return fail(user.status === "suspended" ? "suspended" : "invalid_credentials");

  const isStaff = STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number]);
  await createSession(user.id, user.role, { mfaVerified: !isStaff });
  await db().update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  await audit({ actorId: user.id, action: "user.login", targetType: "user", targetId: user.id });

  const dest = safeNext(next);
  if (isStaff) redirect(`/security/2fa${dest !== "/" ? `?next=${encodeURIComponent(dest)}` : ""}`);
  redirect(dest);
}

export async function logout(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}

export async function logoutEverywhere(): Promise<void> {
  const s = await getSession();
  if (s) {
    await destroyAllSessions(s.user.id);
    await audit({ actorId: s.user.id, action: "user.logout_all" });
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ───────────── Language ─────────────

export async function setLanguage(lang: string): Promise<void> {
  if (!(LANGS as readonly string[]).includes(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 86_400, sameSite: "lax", httpOnly: false });
  const s = await getSession();
  if (s) await db().update(users).set({ lang }).where(eq(users.id, s.user.id));
}

// ───────────── Two-step login (staff) ─────────────


function newRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const raw = crypto.randomBytes(5).toString("hex");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashed: plain.map((c) => hmac(`recovery:${c}`)) };
}

export async function confirmTotpSetup(
  _prev: ActionResult<{ recoveryCodes: string[] }> | null,
  formData: FormData,
): Promise<ActionResult<{ recoveryCodes: string[] }> | null> {
  const s = await getSession();
  if (!s || !STAFF_ROLES.includes(s.user.role)) return fail("unauthenticated");
  const limited = await rateLimit(`mfa-setup:${s.user.id}`, 10, 600);
  if (!limited.ok) return fail("rate_limited", { retryAfterSec: limited.retryAfterSec });

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const [u] = await db().select({ enc: users.totpSecretEnc, enabled: users.totpEnabledAt }).from(users).where(eq(users.id, s.user.id));
  if (!u?.enc || u.enabled) return fail("invalid_code");
  if (verifyTotp(decrypt(u.enc), code) === null) return fail("invalid_code");

  const rc = newRecoveryCodes();
  await db().update(users).set({ totpEnabledAt: new Date(), recoveryCodes: rc.hashed }).where(eq(users.id, s.user.id));
  await markMfaVerified(s.id);
  await audit({ actorId: s.user.id, action: "mfa.enrolled" });
  return ok({ recoveryCodes: rc.plain });
}

export async function verifyTwoFactor(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const key = `mfa:${s.user.id}`;
  const lock = await lockStatus(key);
  if (!lock.ok) return fail("locked", { retryAfterSec: lock.retryAfterSec });

  const input = String(formData.get("code") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  const [u] = await db().select({ enc: users.totpSecretEnc, enabled: users.totpEnabledAt, rc: users.recoveryCodes }).from(users).where(eq(users.id, s.user.id));
  if (!u?.enc || !u.enabled) redirect("/security/2fa");

  let good = verifyTotp(decrypt(u.enc), input.replace(/\s/g, "")) !== null;
  if (!good && /^[0-9a-f]{5}-[0-9a-f]{5}$/i.test(input)) {
    const h = hmac(`recovery:${input.toLowerCase()}`);
    if (u.rc?.includes(h)) {
      good = true;
      await db()
        .update(users)
        .set({ recoveryCodes: u.rc.filter((x) => x !== h) })
        .where(eq(users.id, s.user.id));
      await audit({ actorId: s.user.id, action: "mfa.recovery_code_used" });
    }
  }
  if (!good) {
    await recordFailure(key, 5, 600, 900);
    return fail("invalid_code");
  }
  await clearFailures(key);
  await markMfaVerified(s.id);
  redirect(next);
}

// ───────────── Email verification & password reset ─────────────

async function sendVerificationEmail(userId: string, email: string, lang: Lang): Promise<boolean> {
  const code = await issueCode(userId, "email_verify", email);
  const { t } = makeT(lang);
  return sendMail({ to: email, subject: t("mail_verify_subject"), text: t("mail_verify_body", { code }) });
}

export async function sendEmailVerification(): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return fail("unauthenticated");
  if (!features().email) return fail("email_not_configured");
  if (s.user.emailVerified) return ok();
  const limited = await rateLimit(`email-code:${s.user.id}`, 5, 3600);
  if (!limited.ok) return fail("rate_limited", { retryAfterSec: limited.retryAfterSec });
  const sent = await sendVerificationEmail(s.user.id, s.user.email, await getLang());
  return sent ? ok() : fail("send_failed");
}

export async function verifyEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) return fail("unauthenticated");
  const limited = await rateLimit(`email-verify:${s.user.id}`, 10, 600);
  if (!limited.ok) return fail("rate_limited", { retryAfterSec: limited.retryAfterSec });
  const res = await consumeCode(s.user.id, "email_verify", String(formData.get("code") ?? ""));
  if (!res.ok) return fail(`code_${res.reason}`);
  await db().update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, s.user.id), eq(users.email, res.target)));
  await audit({ actorId: s.user.id, action: "user.email_verified" });
  return ok();
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!features().email) return fail("email_not_configured");
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return fail("validation", { fields: { email: "invalid_email" } });
  const email = parsed.data;
  const ip = await ipKey();
  const a = await rateLimit(`reset-ip:${ip}`, 10, 3600);
  const b = await rateLimit(`reset-email:${sha256(email).slice(0, 20)}`, 3, 3600);
  if (!a.ok || !b.ok) return fail("rate_limited", { retryAfterSec: Math.max(a.retryAfterSec, b.retryAfterSec) });

  const [u] = await db().select({ id: users.id, lang: users.lang, status: users.status }).from(users).where(eq(users.email, email));
  if (u && u.status === "active") {
    const code = await issueCode(u.id, "password_reset", email);
    const { t } = makeT(u.lang as Lang);
    await sendMail({ to: email, subject: t("mail_reset_subject"), text: t("mail_reset_body", { code }) });
  }
  // Same answer whether or not the account exists.
  return ok();
}

const resetSchema = z.object({ email: emailSchema, code: z.string().min(6).max(6), password: z.string().min(1).max(200) });

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseInput(resetSchema, formData);
  if ("error" in parsed) return fail("invalid_code");
  const { email, code, password } = parsed.data;
  const ip = await ipKey();
  const lim = await rateLimit(`reset-try:${ip}`, 10, 900);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });

  const [u] = await db().select({ id: users.id, name: users.name, status: users.status }).from(users).where(eq(users.email, email));
  if (!u || u.status !== "active") return fail("invalid_code");
  const problem = checkPassword(password, { email, name: u.name });
  if (problem) return fail("validation", { fields: { password: `password_${problem}` } });

  const res = await consumeCode(u.id, "password_reset", code);
  if (!res.ok) return fail(`code_${res.reason}`);

  await db().update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, u.id));
  await destroyAllSessions(u.id);
  await audit({ actorId: u.id, action: "user.password_reset" });
  redirect("/login?reset=1");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) return fail("unauthenticated");
  const lim = await rateLimit(`pwchange:${s.user.id}`, 10, 3600);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const [u] = await db().select({ hash: users.passwordHash, name: users.name }).from(users).where(eq(users.id, s.user.id));
  if (!u || !(await verifyPassword(current, u.hash))) return fail("validation", { fields: { current: "password_wrong" } });
  const problem = checkPassword(next, { email: s.user.email, name: u.name });
  if (problem) return fail("validation", { fields: { password: `password_${problem}` } });

  await db().update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, s.user.id));
  await destroyAllSessions(s.user.id, s.id);
  await audit({ actorId: s.user.id, action: "user.password_changed" });
  return ok();
}

