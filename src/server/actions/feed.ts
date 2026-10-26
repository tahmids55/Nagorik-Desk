"use server";

import { z } from "zod";
import { getSession } from "../auth/session";
import { loadFeed, type FeedItem } from "../queries/feed";
import { rateLimit, ipKey } from "../security/rate-limit";
import { getLang } from "@/i18n/server";
import { SORTS } from "@/lib/constants";

const schema = z.object({
  q: z.string().max(80).optional(),
  area: z.string().max(60).optional(),
  category: z.string().max(40).optional(),
  status: z.enum(["open", "progress", "resolved", "rejected", "overdue"]).optional(),
  sort: z.enum(SORTS).optional(),
  authorId: z.string().uuid().optional(),
  votedBy: z.string().uuid().optional(),
  page: z.number().int().min(1).max(500),
});

/** "Load more" for the feed. Public data only, so it works for signed-out visitors too. */
export async function loadMoreIssues(input: z.infer<typeof schema>): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { items: [], hasMore: false };
  const session = await getSession();
  const limited = await rateLimit(`feed:${session?.user.id ?? (await ipKey())}`, 120, 60);
  if (!limited.ok) return { items: [], hasMore: false };
  const viewer = session ? { id: session.user.id, role: session.user.role } : null;
  return loadFeed({ ...parsed.data, includeAnonymousOfAuthor: true }, viewer, await getLang());
}
