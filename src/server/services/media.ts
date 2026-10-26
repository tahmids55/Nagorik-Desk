import "server-only";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { media } from "../db/schema";
import { features } from "../env";
import { deleteFile, thumbUrlFor, upload } from "./imagekit";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const FULL_PX = 1600;
const THUMB_PX = 480;

/** Identify the real file type from its first bytes, never from the filename or the client's header. */
export function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export type ProcessedImage = { data: Buffer; thumb: Buffer; width: number; height: number };

/** Re-encode as WebP: applies orientation, strips all metadata (EXIF GPS included), bounds the size. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = () => sharp(input, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const full = await base()
    .resize({ width: FULL_PX, height: FULL_PX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base()
    .resize({ width: THUMB_PX, height: THUMB_PX, fit: "cover", position: "centre" })
    .webp({ quality: 70 })
    .toBuffer();
  return { data: full.data, thumb, width: full.info.width, height: full.info.height };
}

export async function saveMedia(ownerId: string, img: ProcessedImage): Promise<string> {
  if (features().imagekit) {
    // One upload; the thumbnail is derived by an ImageKit URL transformation.
    const up = await upload(img.data, `${randomUUID()}.webp`);
    try {
      const [row] = await db()
        .insert(media)
        .values({
          ownerId,
          mime: "image/webp",
          url: up.url,
          thumbUrl: thumbUrlFor(up.url),
          providerFileId: up.fileId,
          width: img.width,
          height: img.height,
          bytes: img.data.length,
        })
        .returning({ id: media.id });
      return row!.id;
    } catch (e) {
      await deleteFile(up.fileId).catch(() => {});
      throw e;
    }
  }
  const [row] = await db()
    .insert(media)
    .values({
      ownerId,
      mime: "image/webp",
      data: img.data,
      thumb: img.thumb,
      width: img.width,
      height: img.height,
      bytes: img.data.length,
    })
    .returning({ id: media.id });
  return row!.id;
}

/**
 * Claim uploaded images for an issue / update / avatar. Only images the user uploaded
 * themselves and that are not attached elsewhere can be claimed. Returns the claimed ids in order.
 */
export async function claimMedia(tx: Tx, ownerId: string, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await tx
    .update(media)
    .set({ attachedAt: new Date() })
    .where(and(inArray(media.id, unique), eq(media.ownerId, ownerId), isNull(media.attachedAt)))
    .returning({ id: media.id });
  const ok = new Set(rows.map((r) => r.id));
  if (ok.size !== unique.length) throw new Error("media_invalid");
  return unique;
}
