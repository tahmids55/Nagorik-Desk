import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { media } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";

export const runtime = "nodejs";

const redirect = (location: string, cache: string) =>
  new Response(null, { status: 302, headers: { Location: location, "Cache-Control": cache, "Referrer-Policy": "no-referrer" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return new Response("Not found", { status: 404 });
  const thumb = new URL(req.url).searchParams.get("s") === "thumb";

  const [row] = await db()
    .select({
      body: thumb ? media.thumb : media.data,
      url: media.url,
      thumbUrl: media.thumbUrl,
      mime: media.mime,
      ownerId: media.ownerId,
      attachedAt: media.attachedAt,
    })
    .from(media)
    .where(eq(media.id, params.id));
  if (!row) return new Response("Not found", { status: 404 });

  const remote = (thumb ? row.thumbUrl : row.url) ?? row.url;
  // An upload that has not been attached to anything yet is private to its owner.
  if (!row.attachedAt) {
    const s = await getSession();
    if (!s || s.user.id !== row.ownerId) return new Response("Not found", { status: 404 });
    if (remote) return redirect(remote, "private, no-store");
    if (!row.body) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(row.body), {
      headers: { "Content-Type": row.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  }

  if (remote) return redirect(remote, "public, max-age=3600");
  if (!row.body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.body), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
