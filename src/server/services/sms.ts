import "server-only";
import { env, features } from "../env";
import { log } from "../log";

/**
 * Generic HTTP SMS gateway adapter, configured only through environment variables:
 *   SMS_PROVIDER=http, SMS_HTTP_URL, SMS_HTTP_METHOD, SMS_HTTP_BODY, SMS_API_KEY, SMS_SENDER_ID
 * The body template may use {to}, {text}, {sender}. The API key is sent as a Bearer token.
 * Returns false when not configured or when the gateway rejects the message.
 */
export async function sendSms(to: string, text: string): Promise<boolean> {
  if (!features().sms) return false;
  const e = env();
  const esc = (s: string) => JSON.stringify(s).slice(1, -1);
  const body = (e.SMS_HTTP_BODY ?? '{"to":"{to}","text":"{text}","sender":"{sender}"}')
    .replace("{to}", esc(to))
    .replace("{text}", esc(text))
    .replace("{sender}", esc(e.SMS_SENDER_ID ?? ""));
  try {
    const res = await fetch(e.SMS_HTTP_URL!, {
      method: e.SMS_HTTP_METHOD ?? "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${e.SMS_API_KEY}` },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) log.warn("sms gateway rejected message", { status: res.status });
    return res.ok;
  } catch (err) {
    log.error("sms send failed", { err: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
