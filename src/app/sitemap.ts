import type { MetadataRoute } from "next";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { issues } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** Public issues and pages only. Portals and accounts are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const rows = await db().select({ id: issues.id, updatedAt: issues.updatedAt }).from(issues).where(isNull(issues.hiddenAt)).orderBy(desc(issues.createdAt)).limit(5000);
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/map`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/accountability`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    ...rows.map((r) => ({ url: `${base}/issues/${r.id}`, lastModified: r.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
