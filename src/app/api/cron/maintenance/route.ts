import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { safeEqual } from "@/server/crypto";
import { log } from "@/server/log";
import { deleteFile } from "@/server/services/imagekit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily housekeeping. Call with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron does this automatically; on a plain server use cron + curl).
 * Every step is idempotent.
 */
export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const run = async (name: string, query: ReturnType<typeof sql>) => {
    const res = await db().execute(query);
    return [name, res.rowCount ?? 0] as const;
  };

  // Orphans stored on ImageKit must be removed there too: delete the DB rows first
  // (returning their remote ids), then best-effort delete the remote files.
  const orphanQuery = sql`delete from nagorik_pg.media where attached_at is null and created_at < now() - interval '24 hours' returning provider_file_id`;
  let remoteDeleted = 0;
  const runOrphans = async () => {
    const res = await db().execute(orphanQuery);
    const ids = (res.rows as { provider_file_id: string | null }[]).map((r) => r.provider_file_id).filter((v): v is string => !!v);
    for (const id of ids) {
      try {
        await deleteFile(id);
        remoteDeleted++;
      } catch (e) {
        log.warn("imagekit orphan delete failed", { err: e instanceof Error ? e.message : String(e) });
      }
    }
    return ["orphan_media", res.rowCount ?? 0] as const;
  };

  const results = await Promise.all([
    run("sessions", sql`delete from nagorik_pg.sessions where expires_at < now()`),
    run("codes", sql`delete from nagorik_pg.verification_codes where expires_at < now() - interval '1 day'`),
    run("rate_limits", sql`delete from nagorik_pg.rate_limits where window_start < now() - interval '1 day' and (locked_until is null or locked_until < now())`),
    runOrphans(),
    run("old_notifications", sql`delete from nagorik_pg.notifications where read_at is not null and created_at < now() - interval '180 days'`),
  ]);
  const summary = { ...Object.fromEntries(results), orphan_media_remote: remoteDeleted };
  log.info("maintenance complete", summary);
  return NextResponse.json({ ok: true, deleted: summary });
}
