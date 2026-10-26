import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword, verifyPassword } from "@/server/auth/password";
import { base32Decode, base32Encode, hotp, totp, verifyTotp } from "@/server/auth/totp";
import { decrypt, encrypt, hmac, randomCode, safeEqual } from "@/server/crypto";
import { safeNext } from "@/lib/safe-next";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("a-long-unusual-passphrase");
    const b = await hashPassword("a-long-unusual-passphrase");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("a-long-unusual-passphrase", a)).toBe(true);
    expect(await verifyPassword("a-long-unusual-passphrasE", a)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });

  it("applies the policy", () => {
    expect(checkPassword("short")).toBe("too_short");
    expect(checkPassword("password123")).toBe("too_common");
    expect(checkPassword("aaaaaaaaaaaa")).toBe("too_common");
    expect(checkPassword("rahimuddin-2025", { email: "rahimuddin@example.org" })).toBe("same_as_identity");
    expect(checkPassword("correct horse battery")).toBeNull();
  });
});

describe("TOTP (RFC 6238)", () => {
  // RFC 6238 appendix B uses the ASCII secret "12345678901234567890" with SHA-1
  const secret = base32Encode(Buffer.from("12345678901234567890"));

  it("round-trips base32", () => {
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });

  it("matches the RFC test vectors (last 6 digits)", () => {
    expect(totp(secret, 59_000)).toBe("287082");
    expect(totp(secret, 1_111_111_109_000)).toBe("081804");
    expect(totp(secret, 1_234_567_890_000)).toBe("005924");
    expect(hotp(secret, 0)).toBe("755224");
  });

  it("accepts one step of clock drift but not more", () => {
    const now = 1_700_000_000_000;
    const code = totp(secret, now);
    expect(verifyTotp(secret, code, now)).not.toBeNull();
    expect(verifyTotp(secret, code, now + 30_000)).not.toBeNull();
    expect(verifyTotp(secret, code, now + 120_000)).toBeNull();
    expect(verifyTotp(secret, "abc123", now)).toBeNull();
  });
});

describe("crypto helpers", () => {
  it("encrypts and decrypts with authentication", () => {
    const c = encrypt("secret value");
    expect(c.startsWith("v1.")).toBe(true);
    expect(c).not.toContain("secret");
    expect(decrypt(c)).toBe("secret value");
    const parts = c.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("produces stable keyed hashes", () => {
    expect(hmac("x")).toBe(hmac("x"));
    expect(hmac("x")).not.toBe(hmac("y"));
    expect(hmac("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates numeric codes and compares in constant time", () => {
    for (let i = 0; i < 50; i++) expect(randomCode(6)).toMatch(/^\d{6}$/);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("safeNext (open redirect protection)", () => {
  it("allows only same-site paths", () => {
    expect(safeNext("/issues/1")).toBe("/issues/1");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("/ok\r\nSet-Cookie: x=1")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
