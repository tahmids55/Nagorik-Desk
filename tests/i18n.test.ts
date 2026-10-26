import { describe, expect, it } from "vitest";
import { bn } from "@/i18n/bn";
import { en } from "@/i18n/en";
import { makeT } from "@/i18n/translate";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe("i18n catalogs", () => {
  const enKeys = Object.keys(en).sort();
  const bnKeys = Object.keys(bn).sort();

  it("have exactly the same keys", () => {
    expect(bnKeys).toEqual(enKeys);
  });

  it("have no empty values", () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(bn)]) expect(v.trim(), k).not.toBe("");
  });

  it("use the same placeholders in both languages", () => {
    for (const k of enKeys) {
      expect(placeholders((bn as Record<string, string>)[k]!), k).toEqual(placeholders((en as Record<string, string>)[k]!));
    }
  });

  it("contain Bangla script in every Bangla message (except brand-only strings)", () => {
    const skip = new Set(["feed_brand"]);
    for (const [k, v] of Object.entries(bn)) {
      if (skip.has(k)) continue;
      expect(/[\u0980-\u09FF]/.test(v), `${k}: ${v}`).toBe(true);
    }
  });

  it("contain no Bangla script in English messages", () => {
    for (const [k, v] of Object.entries(en)) expect(/[\u0980-\u09FF]/.test(v), k).toBe(false);
  });

  it("define every dynamically-built key family", () => {
    const keys = new Set(enKeys);
    const families: [string, string[]][] = [
      ["status_", ["open", "under_review", "assigned", "in_progress", "resolved", "rejected"]],
      ["role_", ["citizen", "authority", "office", "admin"]],
      ["flag_reason_", ["spam", "abuse", "personal_data", "false_info", "other"]],
      ["kind_", ["government", "local_government", "utility", "public_service", "other"]],
      ["empty_", ["todo_title", "todo_body", "active_title", "active_body", "done_title", "done_body"]],
    ];
    for (const [prefix, items] of families) for (const i of items) expect(keys.has(`${prefix}${i}`), `${prefix}${i}`).toBe(true);
  });

  it("interpolates parameters and plurals", () => {
    const en_ = makeT("en");
    expect(en_.t("due_in_days", { n: 3 })).toBe("Due in 3 days");
    expect(en_.tn("comments", 1)).toBe("1 comment");
    expect(en_.tn("comments", 2)).toBe("2 comments");
    const bn_ = makeT("bn");
    expect(bn_.tn("comments", 12)).toContain("১২");
  });
});
