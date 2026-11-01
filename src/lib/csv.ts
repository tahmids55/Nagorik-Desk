export type CsvValue = string | number | boolean | null | undefined | Date;

/**
 * One RFC 4180 cell. Text that a spreadsheet would run as a formula (=, +, -, @, tab, CR)
 * is prefixed with an apostrophe, because report titles are written by the public.
 */
export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const text = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header row plus data rows, CRLF line endings, with a UTF-8 BOM so Excel shows Bangla correctly. */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
