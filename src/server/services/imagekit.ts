import "server-only";
import { env } from "../env";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const API_URL = "https://api.imagekit.io/v1/files";
const FOLDER = "/nagorik-pg";
/** ImageKit transformation for list/map thumbnails: fit inside 480x480 without upscaling. */
const THUMB_TRANSFORM = "tr=w-480,h-480,c-at_max";

function authHeader(): string {
  const key = env().IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new Error("imagekit_not_configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/** Derive a transformed thumbnail URL from an uploaded file URL. */
export function thumbUrlFor(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${THUMB_TRANSFORM}`;
}

export async function upload(buffer: Buffer, fileName: string, folder: string = FOLDER): Promise<{ url: string; fileId: string }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");
  const res = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: authHeader() }, body: form });
  if (!res.ok) throw new Error(`imagekit_upload_failed_${res.status}`);
  const json = (await res.json()) as { url?: string; fileId?: string };
  if (!json.url || !json.fileId) throw new Error("imagekit_bad_response");
  return { url: json.url, fileId: json.fileId };
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: { Authorization: authHeader() } });
  // 404 = already gone, which is fine (idempotent cleanup).
  if (!res.ok && res.status !== 404) throw new Error(`imagekit_delete_failed_${res.status}`);
}
