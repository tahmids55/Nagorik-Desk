/**
 * Bangladesh working week: Sunday to Thursday (Friday and Saturday are weekends).
 * Calendar maths is done in Asia/Dhaka (UTC+6, no daylight saving).
 */
const DHAKA_OFFSET_MS = 6 * 3_600_000;

const dhakaDow = (d: Date) => new Date(d.getTime() + DHAKA_OFFSET_MS).getUTCDay(); // 0=Sun … 6=Sat
export const isWorkingDay = (d: Date) => {
  const dow = dhakaDow(d);
  return dow !== 5 && dow !== 6;
};

/** Add `days` working days; the result is the END of that day in Dhaka (17:00 office close). */
export function addWorkingDays(from: Date, days: number, holidays: ReadonlySet<string> = new Set()): Date {
  const cursor = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    cursor.setTime(cursor.getTime() + 86_400_000);
    const key = new Date(cursor.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
    if (isWorkingDay(cursor) && !holidays.has(key)) remaining--;
  }
  // 17:00 Dhaka == 11:00 UTC on the same Dhaka calendar day
  const dhaka = new Date(cursor.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), dhaka.getUTCDate(), 11, 0, 0));
}
