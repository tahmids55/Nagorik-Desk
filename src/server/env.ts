import "server-only";
import { z } from "zod";

const hex64 = z.string().regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex characters (32 bytes)");

/** Treat empty strings in .env as "not set". */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(10, "DATABASE_URL is required"),
  DATA_KEY: hex64,
  HMAC_KEY: hex64,
  CRON_SECRET: optional,
  SMTP_URL: optional,
  SMTP_FROM: optional,
  SMS_PROVIDER: optional,
  SMS_HTTP_URL: optional,
  SMS_HTTP_METHOD: optional,
  SMS_HTTP_BODY: optional,
  SMS_API_KEY: optional,
  SMS_SENDER_ID: optional,
  NID_PROVIDER_URL: optional,
  NID_PROVIDER_KEY: optional,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: optional,
  NEXT_PUBLIC_GOOGLE_MAP_ID: optional,
  IMAGEKIT_PUBLIC_KEY: optional,
  IMAGEKIT_PRIVATE_KEY: optional,
  IMAGEKIT_URL_ENDPOINT: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated environment. Throws a readable error on the first use if anything is missing. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";

/** Which optional integrations are configured. Used to show honest UI states. */
export function features() {
  const e = env();
  const smtp = !!e.SMTP_URL && !/example\.(com|org)/i.test(e.SMTP_URL);
  const sms = e.SMS_PROVIDER === "http" && !!e.SMS_HTTP_URL && !!e.SMS_API_KEY;
  return {
    email: smtp,
    sms,
    nid: !!e.NID_PROVIDER_URL && !!e.NID_PROVIDER_KEY,
    maps: !!e.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    imagekit: !!e.IMAGEKIT_PRIVATE_KEY && !!e.IMAGEKIT_URL_ENDPOINT,
  };
}
