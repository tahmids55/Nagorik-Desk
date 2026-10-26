/**
 * Loads REFERENCE data only: areas (3 upazilas, 23 unions) and issue categories.
 * It never creates users, issues, votes or any other content. Safe to re-run.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { poolConfig } from "../src/server/db/pool-config";
import { areas, categories } from "../src/server/db/schema";

const CATEGORIES = [
  { id: "roads", nameEn: "Roads & bridges", nameBn: "রাস্তা ও সেতু", icon: "Route" },
  { id: "electricity", nameEn: "Electricity", nameBn: "বিদ্যুৎ", icon: "Zap" },
  { id: "water", nameEn: "Water & sanitation", nameBn: "পানি ও স্যানিটেশন", icon: "Droplets" },
  { id: "health", nameEn: "Health", nameBn: "স্বাস্থ্য", icon: "HeartPulse" },
  { id: "education", nameEn: "Education", nameBn: "শিক্ষা", icon: "GraduationCap" },
  { id: "agriculture", nameEn: "Agriculture & irrigation", nameBn: "কৃষি ও সেচ", icon: "Sprout" },
  { id: "relief", nameEn: "Flood, erosion & cold-wave relief", nameBn: "বন্যা, ভাঙন ও শীতার্ত সহায়তা", icon: "LifeBuoy" },
  { id: "market", nameEn: "Markets, trade & land port", nameBn: "হাটবাজার, ব্যবসা ও স্থলবন্দর", icon: "Store" },
  { id: "environment", nameEn: "Environment & waste", nameBn: "পরিবেশ ও বর্জ্য", icon: "Leaf" },
  { id: "safety", nameEn: "Public safety", nameBn: "জননিরাপত্তা", icon: "ShieldAlert" },
  { id: "other", nameEn: "Other", nameBn: "অন্যান্য", icon: "Ellipsis" },
].map((c, i) => ({ ...c, sort: i }));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ ...poolConfig(url), max: 1 });
  const db = drizzle(pool);
  try {
    const rows = JSON.parse(fs.readFileSync(path.resolve("data/reference/areas.json"), "utf8")) as (typeof areas.$inferInsert)[];
    // parents first (upazilas), then unions
    const ordered = [...rows.filter((r) => r.kind === "upazila"), ...rows.filter((r) => r.kind === "union")];
    await db.insert(areas).values(ordered).onConflictDoUpdate({
      target: areas.id,
      set: {
        nameEn: sql`excluded.name_en`,
        nameBn: sql`excluded.name_bn`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        parentId: sql`excluded.parent_id`,
      },
    });
    await db.insert(categories).values(CATEGORIES).onConflictDoUpdate({
      target: categories.id,
      set: {
        nameEn: sql`excluded.name_en`,
        nameBn: sql`excluded.name_bn`,
        icon: sql`excluded.icon`,
        sort: sql`excluded.sort`,
      },
    });
    console.log(`Reference data loaded: ${ordered.length} areas, ${CATEGORIES.length} categories.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
