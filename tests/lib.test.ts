import { describe, expect, it } from "vitest";
import { makeT } from "@/i18n/translate";
import { csvCell, toCsv } from "@/lib/csv";
import { deadlineDays, distanceParts, formatNear, isActiveStatus, parseNear, parseRefCode, refCode } from "@/lib/issue";
import { notificationText } from "@/lib/notifications";

describe("reference codes", () => {
  it("formats with five digits", () => {
    expect(refCode(7)).toBe("PG-00007");
    expect(refCode(123456)).toBe("PG-123456");
  });

  it("parses the forms people type", () => {
    for (const q of ["PG-00042", "pg-42", "PG 42", "#PG-42", "  pg00042  "]) expect(parseRefCode(q), q).toBe(42);
  });

  it("leaves ordinary searches alone", () => {
    for (const q of ["42", "road PG-42", "PG-", "PG-0", "", null, undefined, "PGA-12"]) expect(parseRefCode(q), String(q)).toBeNull();
  });
});

describe("near me", () => {
  it("accepts positions in Panchagarh and rounds them to about 100 m", () => {
    expect(parseNear("26.33549,88.55212")).toEqual({ lat: 26.335, lng: 88.552 });
    expect(formatNear({ lat: 26.3, lng: 88.5 })).toBe("26.300,88.500");
  });

  it("rejects malformed or far-away positions", () => {
    for (const v of ["", "26.3", "abc,def", "23.8103,90.4125", "26.3,88.5,1", "1e3,88", null]) expect(parseNear(v), String(v)).toBeNull();
  });

  it("formats distances", () => {
    expect(distanceParts(4)).toEqual({ value: 10, unit: "m" });
    expect(distanceParts(347)).toEqual({ value: 350, unit: "m" });
    expect(distanceParts(1234)).toEqual({ value: 1.2, unit: "km" });
    expect(distanceParts(15_400)).toEqual({ value: 15, unit: "km" });
  });
});

describe("deadlines", () => {
  const now = Date.parse("2026-03-01T06:00:00Z");
  it("only counts while an office is working on the issue", () => {
    expect(isActiveStatus("assigned")).toBe(true);
    expect(isActiveStatus("resolved")).toBe(false);
    expect(deadlineDays("2026-03-04T11:00:00Z", "in_progress", now)).toBe(4);
    expect(deadlineDays("2026-02-27T11:00:00Z", "assigned", now)).toBeLessThan(0);
    expect(deadlineDays("2026-03-04T11:00:00Z", "resolved", now)).toBeNull();
    expect(deadlineDays(null, "assigned", now)).toBeNull();
  });
});

describe("CSV export", () => {
  it("quotes cells that need it", () => {
    expect(csvCell('He said "fix it", twice')).toBe('"He said ""fix it"", twice"');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(false)).toBe("false");
    expect(csvCell(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
  });

  it("neutralises spreadsheet formulas written by the public", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-2)).toBe("-2");
  });

  it("starts with a BOM and uses CRLF", () => {
    const csv = toCsv(["a", "b"], [["১", 2]]);
    expect(csv.startsWith("﻿a,b\r\n১,2\r\n")).toBe(true);
  });
});

describe("notification sentences", () => {
  const en = makeT("en").t;
  const bn = makeT("bn").t;
  const kinds: [string, Record<string, string | number | null> | null][] = [
    ["comment", { name: "Rina" }],
    ["status", { to: "assigned" }],
    ["status", { to: "open", new: 1 }],
    ["status", { to: "confirmed" }],
    ["assigned", null],
    ["official_note", null],
    ["extension_requested", null],
    ["extension_decision", { decision: "approve" }],
    ["extension_decision", { decision: "decline" }],
    ["referred_back", null],
    ["reopened", null],
    ["hidden", null],
    ["restored", null],
    ["role_granted", { role: "office" }],
    ["priority", null],
    ["something_new", null],
  ];

  it("builds a sentence for every kind, without leftover placeholders", () => {
    for (const [kind, data] of kinds) {
      for (const t of [en, bn]) {
        const text = notificationText(t, kind, data);
        expect(text.length, kind).toBeGreaterThan(3);
        expect(text, kind).not.toMatch(/\{\w+\}|status_|role_/);
      }
    }
    expect(notificationText(en, "comment", { name: "Rina" })).toBe("Rina commented on a report");
    expect(notificationText(en, "status", { to: "in_progress" })).toBe("Status changed to “In progress”");
  });
});
