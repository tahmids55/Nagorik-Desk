import "server-only";
import { notFound, redirect } from "next/navigation";
import { STAFF_ROLES } from "@/lib/constants";
import { safeNext } from "@/lib/safe-next";
import { can, type Permission } from "./permissions";
import { getSession, type Session } from "./session";

const loginUrl = (next?: string) => `/login${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}`;

/** For pages: signed-in users only. Staff must also have passed two-step login. */
export async function requireUser(next?: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(loginUrl(next));
  if (STAFF_ROLES.includes(s.user.role) && !s.mfaVerified) {
    redirect(`/security/2fa${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}`);
  }
  return s;
}

/** For portal pages: needs a permission, otherwise behaves as if the page doesn't exist. */
export async function requirePermission(permission: Permission, next: string): Promise<Session> {
  const s = await requireUser(next);
  if (!can(s.user.role, permission)) notFound();
  return s;
}

/** For server actions: returns null instead of redirecting, so the action can answer with a code. */
export async function actionSession(permission?: Permission): Promise<
  { session: Session } | { error: "unauthenticated" | "forbidden" | "mfa_required" }
> {
  const s = await getSession();
  if (!s) return { error: "unauthenticated" };
  if (STAFF_ROLES.includes(s.user.role) && !s.mfaVerified) return { error: "mfa_required" };
  if (permission && !can(s.user.role, permission)) return { error: "forbidden" };
  return { session: s };
}
