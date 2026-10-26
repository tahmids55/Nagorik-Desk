import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { COMMON_PASSWORDS } from "@/lib/common-passwords";
import { LIMITS } from "@/lib/constants";

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * 1024 * 1024;

/** scrypt hash: `scrypt$N$r$p$salt$hash` (parameters travel with the hash so they can be raised later). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Burn comparable time when the account does not exist, so response time doesn't reveal it. */
let dummy: string | null = null;
export async function fakeVerify(password: string): Promise<void> {
  dummy ??= await hashPassword("not-a-real-password");
  await verifyPassword(password, dummy);
}

export type PasswordProblem = "too_short" | "too_common" | "same_as_identity" | "too_long";

export function checkPassword(password: string, identity: { email?: string; name?: string } = {}): PasswordProblem | null {
  if (password.length < LIMITS.passwordMin) return "too_short";
  if (password.length > 200) return "too_long";
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password)) return "too_common";
  const local = identity.email?.split("@")[0]?.toLowerCase();
  if ((local && local.length >= 4 && lower.includes(local)) || (identity.name && lower === identity.name.toLowerCase())) {
    return "same_as_identity";
  }
  return null;
}
