import { describe, expect, it } from "vitest";
import areas from "../data/reference/areas.json";
import { detectUpazila, nearestArea } from "@/lib/geo/areas";
import { insideConstituency } from "@/lib/geo/boundary";
import { boxAround, haversineMeters } from "@/lib/geo/geo";
import { can, PERMISSIONS } from "@/server/auth/permissions";
import { issueSchema, normalizeBdPhone, registerSchema } from "@/lib/validation";
import { addWorkingDays, isWorkingDay } from "@/lib/working-days";
import { authorityActionsFor, authorityTransition, officeActionsFor, officeTransition } from "@/lib/workflow";
import { titleSimilarity } from "@/server/queries/issues";
import { ROLES } from "@/lib/constants";

describe("geography", () => {
  it("every reference area centre lies inside the constituency", () => {
    for (const a of areas) expect(insideConstituency(a.lat, a.lng), a.id).toBe(true);
  });

  it("rejects places outside Panchagarh-1", () => {
    expect(insideConstituency(23.8103, 90.4125)).toBe(false); // Dhaka
    expect(insideConstituency(26.0, 88.5)).toBe(false); // south of the boundary
    expect(insideConstituency(Number.NaN, 88.5)).toBe(false);
  });

  it("detects the upazila from a point", () => {
    const tetulia = areas.find((a) => a.id === "tetulia")!;
    expect(detectUpazila(tetulia.lat, tetulia.lng)).toBe("tetulia");
  });

  it("measures distance and bounding boxes", () => {
    const a = { lat: 26.33, lng: 88.55 };
    const b = { lat: 26.3325, lng: 88.55 }; // about 280 m north
    expect(Math.round(haversineMeters(a, b) / 10) * 10).toBeGreaterThanOrEqual(270);
    const box = boxAround(a, 300);
    expect(b.lat).toBeLessThanOrEqual(box.maxLat + 1e-9);
    expect(nearestArea(a, areas.filter((x) => x.kind === "union"))?.id).toBeTruthy();
  });
});

describe("working days (Sunday to Thursday)", () => {
  const dhaka = (iso: string) => new Date(`${iso}+06:00`);

  it("treats Friday and Saturday as weekend", () => {
    expect(isWorkingDay(dhaka("2026-03-01T10:00:00"))).toBe(true); // Sunday
    expect(isWorkingDay(dhaka("2026-03-05T10:00:00"))).toBe(true); // Thursday
    expect(isWorkingDay(dhaka("2026-03-06T10:00:00"))).toBe(false); // Friday
    expect(isWorkingDay(dhaka("2026-03-07T10:00:00"))).toBe(false); // Saturday
  });

  it("3 working days from a Thursday is the following Tuesday", () => {
    const due = addWorkingDays(dhaka("2026-03-05T10:00:00"), 3);
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(due)).toBe("2026-03-10");
  });

  it("a holiday in between moves the deadline one working day later", () => {
    const due = addWorkingDays(dhaka("2026-03-05T10:00:00"), 3, new Set(["2026-03-09"]));
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(due)).toBe("2026-03-11");
  });

  it("the deadline is office close (17:00 Dhaka)", () => {
    const due = addWorkingDays(dhaka("2026-03-01T09:00:00"), 1);
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false }).format(due)).toBe("17:00");
  });
});

describe("issue workflow", () => {
  it("office can review, assign and close, but only from valid states", () => {
    expect(officeTransition("review", "open")).toBe("under_review");
    expect(officeTransition("review", "assigned")).toBeNull();
    expect(officeTransition("assign", "under_review")).toBe("assigned");
    expect(officeTransition("assign", "resolved")).toBeNull();
    expect(officeTransition("reject", "in_progress")).toBe("rejected");
    expect(officeTransition("reopen", "rejected")).toBe("under_review");
    expect(officeTransition("reopen", "open")).toBeNull();
  });

  it("authority works only on assigned / in-progress issues", () => {
    expect(authorityTransition("acknowledge", "assigned")).toEqual({ allowed: true, to: "in_progress" });
    expect(authorityTransition("resolve", "in_progress")).toEqual({ allowed: true, to: "resolved" });
    expect(authorityTransition("resolve", "open").allowed).toBe(false);
    expect(authorityTransition("refer_back", "assigned").to).toBe("under_review");
    expect(authorityActionsFor("resolved")).toEqual([]);
    expect(officeActionsFor("open")).toContain("assign");
  });
});

describe("separation of duties", () => {
  it("the MP office cannot moderate, and admins cannot triage or work issues", () => {
    expect(can("office", "moderate")).toBe(false);
    expect(can("office", "users:manage")).toBe(false);
    expect(can("admin", "issue:triage")).toBe(false);
    expect(can("admin", "issue:work")).toBe(false);
    expect(can("authority", "issue:triage")).toBe(false);
    expect(can("authority", "moderate")).toBe(false);
    expect(can("citizen", "issue:triage")).toBe(false);
    expect(can(null, "issue:vote")).toBe(false);
  });

  it("every role can take part as a citizen", () => {
    for (const r of ROLES) {
      expect(can(r, "issue:create")).toBe(true);
      expect(can(r, "issue:vote")).toBe(true);
    }
  });

  it("only known roles appear in the permission table", () => {
    for (const roles of Object.values(PERMISSIONS)) for (const r of roles) expect(ROLES).toContain(r);
  });
});

describe("input validation", () => {
  it("normalises Bangladesh mobile numbers", () => {
    expect(normalizeBdPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("+8801712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("8801712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("017 1234-5678")).toBe("+8801712345678");
    expect(normalizeBdPhone("01212345678")).toBeNull();
    expect(normalizeBdPhone("0171234567")).toBeNull();
  });

  it("validates a report", () => {
    const ok = issueSchema.safeParse({ title: "Broken bridge near the bazaar", body: "The bridge has a hole and children cross it every day.", categoryId: "roads", upazilaId: "tetulia" });
    expect(ok.success).toBe(true);
    const bad = issueSchema.safeParse({ title: "short", body: "tiny", categoryId: "", upazilaId: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues.map((i) => i.message)).toEqual(expect.arrayContaining(["title_short", "body_short", "category_required", "area_required"]));
  });

  it("requires terms on registration and lowercases email", () => {
    const base = { name: "Rahim Uddin", email: " Rahim@Example.ORG ", password: "x", upazilaId: "sadar" };
    expect(registerSchema.safeParse(base).success).toBe(false);
    const r = registerSchema.safeParse({ ...base, acceptTerms: "on" });
    expect(r.success && r.data.email).toBe("rahim@example.org");
  });

  it("scores duplicate-looking titles", () => {
    expect(titleSimilarity("Broken bridge near Tetulia bazaar", "Bridge broken near the Tetulia bazaar")).toBeGreaterThan(0.5);
    expect(titleSimilarity("Broken bridge near Tetulia bazaar", "No electricity in Atwari village")).toBeLessThan(0.2);
  });
});
