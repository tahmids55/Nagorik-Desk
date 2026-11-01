import type { IssueStatus } from "./constants";
import { daysUntil } from "./format";

/** Public reference shown on every report, e.g. PG-00042. */
export const refCode = (seq: number) => `PG-${String(seq).padStart(5, "0")}`;

/** "PG-42", "pg 00042" or "#PG-42" → 42. Anything else → null (a normal text search). */
export function parseRefCode(q: string | undefined | null): number | null {
  const m = /^\s*#?PG[-\s]?0*(\d{1,9})\s*$/i.exec(q ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Statuses during which an office is on the clock. */
export const isActiveStatus = (s: IssueStatus | string) => s === "assigned" || s === "in_progress";

/** Days left until the deadline (negative when overdue), only while an office is working on it. */
export function deadlineDays(dueAt: string | null, status: IssueStatus, now = Date.now()): number | null {
  return dueAt && isActiveStatus(status) ? daysUntil(dueAt, now) : null;
}

/** "350 m" / "1.2 km" / "12 km". Digits are localised by the caller. */
export function distanceParts(meters: number): { value: number; unit: "m" | "km" } {
  if (meters < 1000) return { value: Math.max(10, Math.round(meters / 10) * 10), unit: "m" };
  return { value: meters < 10_000 ? Math.round(meters / 100) / 10 : Math.round(meters / 1000), unit: "km" };
}

/**
 * "Near me" travels in the URL as `near=26.335,88.552`. Coordinates are rounded to about 100 m,
 * and anything outside the Panchagarh area is ignored.
 */
export function parseNear(v: string | undefined | null): { lat: number; lng: number } | null {
  const m = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(v ?? "");
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!(lat >= 25.5 && lat <= 27.2 && lng >= 87.8 && lng <= 89.4)) return null;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

export const formatNear = (p: { lat: number; lng: number }) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
