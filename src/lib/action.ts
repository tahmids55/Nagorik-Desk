/**
 * Server actions never return display text. They return a stable `code`
 * that the client maps to a message in the active language.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; code: string; fields?: Record<string, string>; retryAfterSec?: number };

export const fail = (code: string, extra?: { fields?: Record<string, string>; retryAfterSec?: number }) =>
  ({ ok: false as const, code, ...extra });

export function ok(): { ok: true };
export function ok<T>(data: T): { ok: true; data: T };
export function ok<T>(data?: T) {
  return data === undefined ? { ok: true as const } : { ok: true as const, data };
}
