import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

const key = (hex: string) => Buffer.from(hex, "hex");

/** AES-256-GCM. Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). The prefix allows key rotation later. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(env().DATA_KEY), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unsupported ciphertext format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(env().DATA_KEY), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** Keyed hash for lookups / uniqueness without storing the raw value (e.g. an NID). */
export function hmac(value: string): string {
  return crypto.createHmac("sha256", key(env().HMAC_KEY)).update(value).digest("hex");
}

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

/** Uniformly random numeric code, e.g. 6 digits. */
export function randomCode(digits = 6): string {
  return crypto.randomInt(0, 10 ** digits).toString().padStart(digits, "0");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
