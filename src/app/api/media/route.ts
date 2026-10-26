import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { sameOrigin } from "@/server/security/origin";
import { log } from "@/server/log";
import { MAX_UPLOAD_BYTES, processImage, saveMedia, sniffImage } from "@/server/services/media";
import { STAFF_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const err = (code: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, code, ...extra }, { status });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("bad_origin", 403);

  const session = await getSession();
  if (!session) return err("unauthenticated", 401);
  if (STAFF_ROLES.includes(session.user.role) && !session.mfaVerified) return err("mfa_required", 403);

  const limit = await rateLimit(`upload:${session.user.id}`, 30, 3600);
  if (!limit.ok) return err("rate_limited", 429, { retryAfterSec: limit.retryAfterSec });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return err("too_large", 413);

  let file: Blob | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f && typeof f === "object" && typeof (f as Blob).arrayBuffer === "function") {
      file = f as Blob;
    }
  } catch (e) {
    log.warn("formData parse failed", { err: e instanceof Error ? e.message : String(e) });
    return err("bad_request", 400);
  }
  if (!file) return err("bad_request", 400);
  if (file.size > MAX_UPLOAD_BYTES) return err("too_large", 413);

  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(buf)) return err("unsupported_type", 415);

  try {
    const processed = await processImage(buf);
    const id = await saveMedia(session.user.id, processed);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    log.warn("image processing failed", { err: e instanceof Error ? e.message : String(e) });
    return err("unprocessable", 422);
  }
}
