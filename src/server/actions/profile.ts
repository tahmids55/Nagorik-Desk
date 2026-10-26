"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { areas, issues, notifications, users } from "../db/schema";
import { actionSession } from "../auth/guards";
import { destroyAllSessions, destroyCurrentSession, getSession } from "../auth/session";
import { hashPassword, verifyPassword } from "../auth/password";
import { audit } from "../security/audit";
import { rateLimit } from "../security/rate-limit";
import { claimMedia } from "../services/media";
import { consumeCode, issueCode } from "../services/codes";
import { sendSms } from "../services/sms";
import { features } from "../env";
import { fail, ok, type ActionResult } from "@/lib/action";
import { STAFF_ROLES } from "@/lib/constants";
import { normalizeBdPhone, profileSchema } from "@/lib/validation";
import { getLang } from "@/i18n/server";
import { makeT } from "@/i18n/translate";
import { isUniqueViolation, parseInput } from "./_util";

export type FormState = ActionResult | null;

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const parsed = parseInput(profileSchema, formData);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const [up] = await db().select().from(areas).where(eq(areas.id, d.upazilaId));
  if (!up || up.kind !== "upazila") return fail("validation", { fields: { upazilaId: "area_required" } });
  if (d.unionId) {
    const [un] = await db().select().from(areas).where(eq(areas.id, d.unionId));
    if (!un || un.parentId !== up.id) return fail("validation", { fields: { unionId: "area_invalid" } });
  }

  try {
    await db().transaction(async (tx) => {
      let avatar: string | undefined;
      if (d.avatarMediaId) {
        const [cur] = await tx.select({ a: users.avatarMediaId }).from(users).where(eq(users.id, user.id));
        if (cur?.a !== d.avatarMediaId) {
          await claimMedia(tx, user.id, [d.avatarMediaId]);
          avatar = d.avatarMediaId;
        }
      }
      await tx
        .update(users)
        .set({ name: d.name, bio: d.bio, upazilaId: d.upazilaId, unionId: d.unionId, ...(avatar ? { avatarMediaId: avatar } : {}) })
        .where(eq(users.id, user.id));
    });
  } catch (e) {
    if (e instanceof Error && e.message === "media_invalid") return fail("media_invalid");
    throw e;
  }
  revalidatePath(`/u/${user.id}`);
  revalidatePath("/settings");
  return ok();
}

export async function removeAvatar(): Promise<ActionResult> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  await db().update(users).set({ avatarMediaId: null }).where(eq(users.id, a.session.user.id));
  revalidatePath("/settings");
  return ok();
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  if (STAFF_ROLES.includes(user.role)) return fail("staff_cannot_delete");
  const lim = await rateLimit(`delete-account:${user.id}`, 5, 3600);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });

  const [u] = await db().select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!u || !(await verifyPassword(String(formData.get("password") ?? ""), u.hash))) {
    return fail("validation", { fields: { password: "password_wrong" } });
  }

  // Personal data is erased; the civic record (issues, votes) stays but is no longer linked to a name.
  await db()
    .update(users)
    .set({
      name: "Deleted user",
      email: `deleted+${user.id}@invalid.local`,
      emailVerifiedAt: null,
      phone: null,
      phoneVerifiedAt: null,
      nidHmac: null,
      nidVerifiedAt: null,
      bio: null,
      avatarMediaId: null,
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      status: "deleted",
      deletedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await destroyAllSessions(user.id);
  await audit({ actorId: user.id, action: "user.deleted", targetType: "user", targetId: user.id });
  await destroyCurrentSession().catch(() => undefined);
  redirect("/?deleted=1");
}

// ───────────── Notifications ─────────────

export type NotificationItem = {
  id: string;
  kind: string;
  data: Record<string, string | number | null> | null;
  issueId: string | null;
  issueTitle: string | null;
  createdAt: string;
  readAt: string | null;
};

export async function fetchUserNotifications(): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const s = await getSession();
  if (!s) return { items: [], unreadCount: 0 };
  const rows = await db()
    .select({ n: notifications, title: issues.title })
    .from(notifications)
    .leftJoin(issues, eq(issues.id, notifications.issueId))
    .where(eq(notifications.userId, s.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const items: NotificationItem[] = rows.map(({ n, title }) => ({
    id: n.id,
    kind: n.kind,
    data: n.data as Record<string, string | number | null> | null,
    issueId: n.issueId,
    issueTitle: title,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));

  const unreadCount = items.filter((i) => !i.readAt).length;
  return { items, unreadCount };
}

export async function markSingleNotificationRead(id: string): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return fail("unauthenticated");
  await db()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, s.user.id), isNull(notifications.readAt)));
  revalidatePath("/notifications");
  return ok();
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return fail("unauthenticated");
  await db()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, s.user.id), isNull(notifications.readAt)));
  revalidatePath("/notifications");
  return ok();
}

// ───────────── Mobile verification (BETA) ─────────────
// Works only when an SMS gateway is configured. Otherwise the UI says the feature is in beta.
// NID verification is intentionally NOT implemented: no NID is collected until an authorised provider exists.

export async function startPhoneVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  if (!features().sms) return fail("beta_unavailable");
  const { user } = a.session;
  const phone = normalizeBdPhone(String(formData.get("phone") ?? ""));
  if (!phone) return fail("validation", { fields: { phone: "invalid_phone" } });
  const lim = await rateLimit(`phone-code:${user.id}`, 5, 3600);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });

  const [taken] = await db().select({ id: users.id }).from(users).where(and(eq(users.phone, phone)));
  if (taken && taken.id !== user.id) return fail("validation", { fields: { phone: "phone_taken" } });

  const code = await issueCode(user.id, "phone_verify", phone);
  const { t } = makeT(await getLang());
  const sent = await sendSms(phone, t("sms_verify_body", { code }));
  return sent ? ok() : fail("send_failed");
}

export async function confirmPhoneVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await actionSession();
  if ("error" in a) return fail(a.error);
  const { user } = a.session;
  const lim = await rateLimit(`phone-verify:${user.id}`, 10, 600);
  if (!lim.ok) return fail("rate_limited", { retryAfterSec: lim.retryAfterSec });
  const res = await consumeCode(user.id, "phone_verify", String(formData.get("code") ?? ""));
  if (!res.ok) return fail(`code_${res.reason}`);
  try {
    await db().update(users).set({ phone: res.target, phoneVerifiedAt: new Date() }).where(eq(users.id, user.id));
  } catch (e) {
    if (isUniqueViolation(e)) return fail("validation", { fields: { phone: "phone_taken" } });
    throw e;
  }
  await audit({ actorId: user.id, action: "user.phone_verified" });
  revalidatePath("/settings");
  return ok();
}
