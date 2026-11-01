import { desc, eq, isNull } from "drizzle-orm";
import { URGENT_UPVOTES } from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { isActiveStatus, refCode } from "@/lib/issue";
import { db } from "@/server/db/client";
import { issues, stakeholders } from "@/server/db/schema";
import { getAreas, getCategories } from "@/server/queries/reference";
import { ipKey, rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;

/**
 * Open data: every public report as CSV. No author, account or contact details are included,
 * and reports hidden by moderators are left out.
 */
export async function GET() {
  const limit = await rateLimit(`export:${await ipKey()}`, 20, 3600);
  if (!limit.ok) {
    return new Response("Too many downloads. Please try again later.\n", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec), "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const [areas, categories, rows] = await Promise.all([
    getAreas(),
    getCategories(),
    db()
      .select({
        id: issues.id,
        seq: issues.seq,
        title: issues.title,
        categoryId: issues.categoryId,
        upazilaId: issues.upazilaId,
        unionId: issues.unionId,
        status: issues.status,
        upvotes: issues.upvotes,
        downvotes: issues.downvotes,
        commentCount: issues.commentCount,
        mpPriority: issues.mpPriority,
        precise: issues.precise,
        lat: issues.lat,
        lng: issues.lng,
        createdAt: issues.createdAt,
        dueAt: issues.dueAt,
        resolvedAt: issues.resolvedAt,
        office: stakeholders.nameEn,
      })
      .from(issues)
      .leftJoin(stakeholders, eq(stakeholders.id, issues.stakeholderId))
      .where(isNull(issues.hiddenAt))
      .orderBy(desc(issues.createdAt))
      .limit(MAX_ROWS),
  ]);

  const area = new Map(areas.map((a) => [a.id, a.nameEn]));
  const category = new Map(categories.map((c) => [c.id, c.nameEn]));
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const now = Date.now();

  const csv = toCsv(
    ["reference", "title", "category", "upazila", "union", "status", "urgent", "mp_priority", "overdue", "office", "upvotes", "downvotes", "comments", "reported_at", "due_at", "resolved_at", "precise_location", "latitude", "longitude", "url"],
    rows.map((r) => [
      refCode(r.seq),
      r.title,
      category.get(r.categoryId) ?? r.categoryId,
      area.get(r.upazilaId) ?? r.upazilaId,
      r.unionId ? (area.get(r.unionId) ?? r.unionId) : "",
      r.status,
      r.upvotes >= URGENT_UPVOTES,
      r.mpPriority,
      !!r.dueAt && r.dueAt.getTime() < now && isActiveStatus(r.status),
      r.office ?? "",
      r.upvotes,
      r.downvotes,
      r.commentCount,
      r.createdAt,
      r.dueAt,
      r.resolvedAt,
      r.precise,
      r.lat.toFixed(5),
      r.lng.toFixed(5),
      `${base}/issues/${r.id}`,
    ]),
  );

  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nagorik-desk-reports-${day}.csv"`,
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
