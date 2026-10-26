import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { issues, users } from "../db/schema";
import type { Role } from "@/lib/constants";

export type ProfileDTO = {
  id: string;
  name: string;
  bio: string | null;
  role: Role;
  avatarMediaId: string | null;
  upazilaId: string | null;
  unionId: string | null;
  officeTitle: string | null;
  stakeholderId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  nidVerified: boolean;
  joinedAt: string;
  stats: { posts: number; supportReceived: number; resolved: number };
};

export async function getProfile(id: string): Promise<ProfileDTO | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [u] = await db().select().from(users).where(eq(users.id, id));
  if (!u || u.status === "deleted") return null;
  // Public stats count only visible, non-anonymous posts.
  const [s] = await db()
    .select({
      posts: sql<number>`count(*)::int`,
      support: sql<number>`coalesce(sum(${issues.upvotes}), 0)::int`,
      resolved: sql<number>`(count(*) filter (where ${issues.status} = 'resolved'))::int`,
    })
    .from(issues)
    .where(and(eq(issues.authorId, id), eq(issues.anonymous, false), sql`${issues.hiddenAt} is null`));
  return {
    id: u.id,
    name: u.name,
    bio: u.bio,
    role: u.role as Role,
    avatarMediaId: u.avatarMediaId,
    upazilaId: u.upazilaId,
    unionId: u.unionId,
    officeTitle: u.officeTitle,
    stakeholderId: u.stakeholderId,
    emailVerified: u.emailVerifiedAt !== null,
    phoneVerified: u.phoneVerifiedAt !== null,
    nidVerified: u.nidVerifiedAt !== null,
    joinedAt: u.createdAt.toISOString(),
    stats: { posts: s?.posts ?? 0, supportReceived: s?.support ?? 0, resolved: s?.resolved ?? 0 },
  };
}
