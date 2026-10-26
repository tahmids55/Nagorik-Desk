import "server-only";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../db/client";
import { users } from "../db/schema";
import { decrypt, encrypt } from "../crypto";
import { generateSecret, otpauthUrl } from "./totp";

/** Returns the pending authenticator secret (and a QR code) for enrolment, creating one if needed. */
export async function pendingTotpSetup(userId: string, email: string) {
  const [u] = await db().select({ enc: users.totpSecretEnc, enabled: users.totpEnabledAt }).from(users).where(eq(users.id, userId));
  if (u?.enabled) return null;
  let secret: string;
  if (u?.enc) secret = decrypt(u.enc);
  else {
    secret = generateSecret();
    await db().update(users).set({ totpSecretEnc: encrypt(secret) }).where(eq(users.id, userId));
  }
  const url = otpauthUrl(secret, email);
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 192, color: { dark: "#0A1020", light: "#FFFFFF" } });
  return { secret, url, qrSvg };
}
