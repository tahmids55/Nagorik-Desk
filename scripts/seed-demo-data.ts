/**
 * Seed script for demo users, Panchagarh civic posts, and WebP profile/post images.
 * Safe to re-run idempotently.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 */
import "./load-env";
import crypto from "node:crypto";
import { promisify } from "node:util";
import sharp from "sharp";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import { poolConfig } from "../src/server/db/pool-config";
import {
  areas,
  categories,
  comments,
  issueMedia,
  issues,
  media,
  stakeholders,
  users,
  votes,
} from "../src/server/db/schema";

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * 1024 * 1024;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

type ProcessedImg = {
  data: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  bytes: number;
};

async function processImageBuffer(input: Buffer): Promise<ProcessedImg> {
  const base = () => sharp(input, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const full = await base()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base()
    .resize({ width: 400, height: 400, fit: "cover", position: "centre" })
    .webp({ quality: 75 })
    .toBuffer();

  return {
    data: full.data,
    thumb,
    width: full.info.width,
    height: full.info.height,
    bytes: full.data.length,
  };
}

async function fetchOrFallbackImage(url: string, fallbackColor: string, title: string): Promise<ProcessedImg> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "nagorik-pg/1.0" }, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const arr = await res.arrayBuffer();
      const buf = Buffer.from(arr);
      return await processImageBuffer(buf);
    }
  } catch {
    // network timeout or fetch error, proceed to fallback generator
  }

  // Graceful SVG generation if remote fetch fails
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${fallbackColor}"/>
          <stop offset="100%" stop-color="#1b2a26"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="400" cy="220" r="100" fill="rgba(255,255,255,0.15)"/>
      <text x="400" y="380" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
      <text x="400" y="420" font-family="sans-serif" font-size="18" fill="#a7f3d0" text-anchor="middle">Panchagarh Civic Platform</text>
    </svg>
  `;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return await processImageBuffer(buf);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ ...poolConfig(url), max: 2 });
  const db = drizzle(pool);

  console.log("Seeding demo data into Neon PostgreSQL...");

  // 1. Seed Stakeholders
  console.log("1. Seeding stakeholders...");
  const lgedId = "11111111-1111-1111-1111-111111111111";
  const palliBidyutId = "22222222-2222-2222-2222-222222222222";
  const dpheId = "33333333-3333-3333-3333-333333333333";

  await db
    .insert(stakeholders)
    .values([
      {
        id: lgedId,
        nameEn: "Local Government Engineering Department (LGED)",
        nameBn: "স্থানীয় সরকার প্রকৌশল অধিদপ্তর (এলজিইডি)",
        kind: "government",
        upazilaId: "sadar",
        active: true,
      },
      {
        id: palliBidyutId,
        nameEn: "Panchagarh Palli Bidyut Samity (BREB)",
        nameBn: "পঞ্চগড় পল্লী বিদ্যুৎ সমিতি",
        kind: "utility",
        upazilaId: "sadar",
        active: true,
      },
      {
        id: dpheId,
        nameEn: "Department of Public Health Engineering (DPHE)",
        nameBn: "জনস্বাস্থ্য প্রকৌশল অধিদপ্তর (ডিপিএইচই)",
        kind: "government",
        upazilaId: "sadar",
        active: true,
      },
    ])
    .onConflictDoUpdate({
      target: stakeholders.id,
      set: {
        nameEn: sql`excluded.name_en`,
        nameBn: sql`excluded.name_bn`,
        active: true,
      },
    });

  // Common password for demo accounts
  const demoPassword = "NagorikPass123!";
  const passwordHash = await hashPassword(demoPassword);

  // 2. Define Demo Users
  const demoUsers = [
    {
      id: "a1000000-0000-0000-0000-000000000001",
      name: "Dr. Tariqul Islam",
      email: "admin@nagorik.gov.bd",
      role: "admin",
      upazilaId: "sadar",
      unionId: "panchagarh-sadar-union",
      officeTitle: "Chief Platform Administrator",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#2563eb",
      avatarLabel: "Dr. Tariqul (Admin)",
    },
    {
      id: "a2000000-0000-0000-0000-000000000002",
      name: "Farhana Akhter",
      email: "office@nagorik.gov.bd",
      role: "office",
      upazilaId: "sadar",
      unionId: "dhakkamara",
      officeTitle: "MP Office Coordinator - Panchagarh",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#059669",
      avatarLabel: "Farhana (MP Office)",
    },
    {
      id: "a3000000-0000-0000-0000-000000000003",
      name: "Engr. Rafiqul Hasan",
      email: "lged.officer@panchagarh.gov.bd",
      role: "authority",
      stakeholderId: lgedId,
      upazilaId: "sadar",
      unionId: "amarkhana",
      officeTitle: "Executive Engineer (LGED)",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#d97706",
      avatarLabel: "Engr. Rafiqul (LGED)",
    },
    {
      id: "c1000000-0000-0000-0000-000000000001",
      name: "Anamul Haque",
      email: "anamul.tetulia@gmail.com",
      role: "citizen",
      upazilaId: "tetulia",
      unionId: "tirnaihat",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#0284c7",
      avatarLabel: "Anamul (Tetulia)",
    },
    {
      id: "c2000000-0000-0000-0000-000000000002",
      name: "Salma Begum",
      email: "salma.panchagarh@gmail.com",
      role: "citizen",
      upazilaId: "sadar",
      unionId: "magura",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#9333ea",
      avatarLabel: "Salma (Sadar)",
    },
    {
      id: "c3000000-0000-0000-0000-000000000003",
      name: "Kamrul Hasan",
      email: "kamrul.atwari@gmail.com",
      role: "citizen",
      upazilaId: "atwari",
      unionId: "mirzapur",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#0d9488",
      avatarLabel: "Kamrul (Atwari)",
    },
    {
      id: "c4000000-0000-0000-0000-000000000004",
      name: "Nusrat Jahan",
      email: "nusrat.tetulia@gmail.com",
      role: "citizen",
      upazilaId: "tetulia",
      unionId: "bhajanpur",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#ec4899",
      avatarLabel: "Nusrat (Tetulia)",
    },
    {
      id: "c5000000-0000-0000-0000-000000000005",
      name: "Shahidul Alam",
      email: "shahidul.panchagarh@gmail.com",
      role: "citizen",
      upazilaId: "sadar",
      unionId: "chaklahat",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#eab308",
      avatarLabel: "Shahidul (Sadar)",
    },
    {
      id: "c6000000-0000-0000-0000-000000000006",
      name: "Tasnim Ara",
      email: "tasnim.atwari@gmail.com",
      role: "citizen",
      upazilaId: "atwari",
      unionId: "radhanagar",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#8b5cf6",
      avatarLabel: "Tasnim (Atwari)",
    },
    {
      id: "c7000000-0000-0000-0000-000000000007",
      name: "Mahmudul Hasan",
      email: "mahmudul.sadar@gmail.com",
      role: "citizen",
      upazilaId: "sadar",
      unionId: "dhakkamara",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
      avatarColor: "#3b82f6",
      avatarLabel: "Mahmudul (Sadar)",
    },
  ];

  console.log("2. Inserting users and generating profile pictures...");
  for (const u of demoUsers) {
    // Upsert user without avatar first
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        stakeholderId: (u as any).stakeholderId ?? null,
        officeTitle: (u as any).officeTitle ?? null,
        upazilaId: u.upazilaId,
        unionId: u.unionId,
        status: "active",
        emailVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: u.name,
          email: u.email,
          role: u.role,
          stakeholderId: (u as any).stakeholderId ?? null,
          officeTitle: (u as any).officeTitle ?? null,
          upazilaId: u.upazilaId,
          unionId: u.unionId,
          status: "active",
        },
      });

    // Process profile picture
    const img = await fetchOrFallbackImage(u.avatarUrl, u.avatarColor, u.avatarLabel);
    const mediaId = crypto.randomUUID();

    await db.insert(media).values({
      id: mediaId,
      ownerId: u.id,
      mime: "image/webp",
      data: img.data,
      thumb: img.thumb,
      width: img.width,
      height: img.height,
      bytes: img.bytes,
      attachedAt: new Date(),
    });

    await db.update(users).set({ avatarMediaId: mediaId }).where(eq(users.id, u.id));
    console.log(`   ✓ Profile created & avatar attached: ${u.name} (${u.role})`);
  }

  // Also attach an avatar to ANY pre-existing users without an avatar
  const usersWithoutAvatar = await db.select().from(users).where(sql`${users.avatarMediaId} IS NULL`);
  for (const u of usersWithoutAvatar) {
    const img = await fetchOrFallbackImage(
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
      "#475569",
      u.name,
    );
    const mediaId = crypto.randomUUID();
    await db.insert(media).values({
      id: mediaId,
      ownerId: u.id,
      mime: "image/webp",
      data: img.data,
      thumb: img.thumb,
      width: img.width,
      height: img.height,
      bytes: img.bytes,
      attachedAt: new Date(),
    });
    await db.update(users).set({ avatarMediaId: mediaId }).where(eq(users.id, u.id));
    console.log(`   ✓ Attached avatar to user: ${u.name} (${u.email})`);
  }

  // 3. Define Panchagarh Civic Posts (Issues) with real Panchagarh imagery
  console.log("3. Creating Panchagarh civic posts with landscape & problem photos...");

  const posts = [
    {
      id: "f1000000-0000-0000-0000-000000000001",
      authorId: "c1000000-0000-0000-0000-000000000001", // Anamul (Tetulia)
      title: "তেঁতুলিয়া রণচণ্ডী চা বাগান সংলগ্ন সংযোগ সড়ক ভাঙন ও ধস",
      body: "তেঁতুলিয়া উপজেলার তিরনইহাট ইউনিয়নের রণচণ্ডী এলাকার চা বাগান সংলগ্ন প্রধান পাকা সড়কটিতে সাম্প্রতিক ভারি বৃষ্টি ও পাহাড়ি ঢলে প্রায় ৫০ মিটার অংশ ভেঙে দেবে গেছে। প্রতিদিন স্থানীয় চা শ্রমিক, শিক্ষার্থী ও ভ্যান-ইজিবাইক চরম ঝুঁকি নিয়ে চলাচল করছে। দ্রুত এলজিইডির পক্ষ থেকে গাইডওয়াল ও সড়ক পুনঃনির্মাণ করা না হলে চা পাতা পরিবহন ও যোগাযোগ পুরোপুরি বিচ্ছিন্ন হয়ে যাবে।",
      categoryId: "roads",
      upazilaId: "tetulia",
      unionId: "tirnaihat",
      lat: 26.512,
      lng: 88.351,
      precise: true,
      landmark: "রণচণ্ডী চা বাগান সংলগ্ন কালভার্ট মোড়",
      isUrgent: true,
      status: "assigned",
      stakeholderId: lgedId,
      upvotes: 14,
      downvotes: 0,
      score: 14,
      photoUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80", // Tea garden landscape
      photoColor: "#15803d",
      photoTitle: "Tetulia Tea Garden Road",
    },
    {
      id: "f2000000-0000-0000-0000-000000000002",
      authorId: "c2000000-0000-0000-0000-000000000002", // Salma (Sadar)
      title: "করতোয়া নদীর তীরবর্তী বাঁধ ও ড্রেনেজ সংস্কারের জরুরি আবেদন",
      body: "পঞ্চগড় সদর উপজেলার অমরখানা ইউনিয়নে করতোয়া নদীর পাড়ের সুরক্ষা বাঁধের কিছু অংশ বর্ষার স্রোতে ক্ষয়প্রাপ্ত হয়েছে। বর্ষার পানি বৃদ্ধির সাথে সাথে নদী সংলগ্ন ফসলি জমি ও বসতবাড়িতে তীব্র ভাঙনের শঙ্কা দেখা দিয়েছে। বাঁধের ফাটল মেরামত এবং স্থায়ী জিওব্যাগ বা সিসি ব্লক ফেলা একান্ত জরুরি।",
      categoryId: "water",
      upazilaId: "sadar",
      unionId: "amarkhana",
      lat: 26.345,
      lng: 88.561,
      precise: true,
      landmark: "অমরখানা ঘাট ব্রিজ সংলগ্ন নদীর বাঁধ",
      isUrgent: false,
      status: "under_review",
      stakeholderId: dpheId,
      upvotes: 9,
      downvotes: 1,
      score: 8,
      photoUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80", // River & embankment
      photoColor: "#0284c7",
      photoTitle: "Karatoya River Embankment",
    },
    {
      id: "f3000000-0000-0000-0000-000000000003",
      authorId: "c3000000-0000-0000-0000-000000000003", // Kamrul (Atwari)
      title: "আটোয়ারী মির্জাপুর বাজার সংলগ্ন কালভার্ট পুনঃনির্মাণ প্রয়োজন",
      body: "আটোয়ারী উপজেলার ঐতিহ্যবাহী মির্জাপুর শাহী মসজিদের উত্তর পাশে মির্জাপুর বাজারমুখী সংযোগ সড়কের পুরানো কালভার্টটির পাটাতন ভেঙে বড় গর্ত সৃষ্টি হয়েছে। রাতের বেলা আলো কম থাকায় প্রায়ই পথচারী ও মোটরসাইকেল আরোহীরা দুর্ঘটনার শিকার হচ্ছেন। স্থানীয় কৃষকদের ধান ও ভুট্টার ট্রাক বাজারে আনা অসম্ভব হয়ে পড়েছে।",
      categoryId: "roads",
      upazilaId: "atwari",
      unionId: "mirzapur",
      lat: 26.248,
      lng: 88.415,
      precise: true,
      landmark: "মির্জাপুর শাহী মসজিদ ও বাজার লিংক রোড",
      isUrgent: true,
      status: "open",
      stakeholderId: null,
      upvotes: 18,
      downvotes: 0,
      score: 18,
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1000&q=80", // Damaged road/infrastructure
      photoColor: "#b45309",
      photoTitle: "Atwari Mirzapur Culvert",
    },
    {
      id: "f4000000-0000-0000-0000-000000000004",
      authorId: "c1000000-0000-0000-0000-000000000001", // Anamul (Tetulia)
      title: "বাংলাবান্ধা জিরো পয়েন্ট মহাসড়কে রাতে সৌরবাতি সচল করার আবেদন",
      body: "তেঁতুলিয়া উপজেলার বাংলাবান্ধা স্থলবন্দর ও জিরো পয়েন্ট সড়কটি উত্তরবঙ্গের প্রধান আন্তর্জাতিক প্রবেশদ্বার। তবে সন্ধ্যা নামার পর স্থানীয় বাজার ও হাইওয়ের বেশ কয়েকটি মোড়ে পর্যাপ্ত বাতি না থাকায় ট্রাক চালক ও স্থানীয় বাসিন্দাদের নিরাপত্তা ব্যাহত হচ্ছে। বিদ্যমান সোলার প্যানেলগুলো পরীক্ষা করে দ্রুত বাতিগুলো সচল করার অনুরোধ জানাচ্ছি।",
      categoryId: "safety",
      upazilaId: "tetulia",
      unionId: "banglabandha",
      lat: 26.561,
      lng: 88.358,
      precise: true,
      landmark: "বাংলাবান্ধা জিরো পয়েন্ট ইমিগ্রেশন চেকপোস্টের পূর্ব পাশ",
      isUrgent: false,
      status: "in_progress",
      stakeholderId: palliBidyutId,
      upvotes: 11,
      downvotes: 0,
      score: 11,
      photoUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1000&q=80", // Highway at evening
      photoColor: "#334155",
      photoTitle: "Banglabandha Highway",
    },
    {
      id: "f5000000-0000-0000-0000-000000000005",
      authorId: "c2000000-0000-0000-0000-000000000002", // Salma (Sadar)
      title: "পঞ্চগড় আধুনিক সদর হাসপাতাল সংলগ্ন ড্রেন পরিষ্কার ও জলাবদ্ধতা নিরসন",
      body: "পঞ্চগড় সদর হাসপাতালের মূল ফটকের পশ্চিম পাশের ড্রেনটি ময়লা-আবর্জনায় বন্ধ হয়ে সামান্য বৃষ্টিতেই নোংরা পানি সড়কে উপচে পড়ত। এতে রোগী, অ্যাম্বুলেন্স ও স্বজনদের হাসপাতালে প্রবেশে চরম দুর্ভোগ পোহাতে হতো। পৌরসভা ও সংশ্লিষ্ট কর্তৃপক্ষের পরিচ্ছন্নতা অভিযানের ফলে সম্প্রতি সমস্যাটির দ্রুত সমাধান হয়েছে।",
      categoryId: "health",
      upazilaId: "sadar",
      unionId: "panchagarh-sadar-union",
      lat: 26.338,
      lng: 88.552,
      precise: true,
      landmark: "পঞ্চগড় আধুনিক সদর হাসপাতাল মেইন গেট",
      isUrgent: false,
      status: "resolved",
      statusNote: "পৌরসভা পরিচ্ছন্নতাকর্মীদের দ্বারা ড্রেনের বর্জ্য অপসারণ ও পানি নিষ্কাশন স্বাভাবিক করা হয়েছে।",
      stakeholderId: dpheId,
      upvotes: 25,
      downvotes: 0,
      score: 25,
      photoUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80", // Healthcare / Clean street
      photoColor: "#047857",
      photoTitle: "Panchagarh Hospital Drainage Cleaned",
    },
    {
      id: "f6000000-0000-0000-0000-000000000006",
      authorId: "c4000000-0000-0000-0000-000000000004", // Nusrat (Tetulia)
      title: "ভজনপুর চা বাগান শ্রমিক পল্লীতে নিরাপদ সুপেয় খাবার পানির সংকট",
      body: "তেঁতুলিয়া উপজেলার ভজনপুর ইউনিয়নের চা শ্রমিক পল্লীতে স্থাপিত দুটি গভীর নলকূপ দীর্ঘদিন ধরে অকেজো হয়ে পড়ে আছে। এর ফলে প্রায় দেড় শতাধিক পরিবারের নারী ও শিশুদের প্রায় দেড় কিলোমিটার দূর থেকে নদী ও অরক্ষিত কুয়া থেকে খাবার পানি সংগ্রহ করতে হচ্ছে। জনস্বাস্থ্য প্রকৌশল অধিদপ্তরের মাধ্যমে দ্রুত সাবমারসিবল পাম্প ও পানির লাইন স্থাপনের জোর দাবি জানাচ্ছি।",
      categoryId: "water",
      upazilaId: "tetulia",
      unionId: "bhajanpur",
      lat: 26.472,
      lng: 88.421,
      precise: true,
      landmark: "ভজনপুর চা শ্রমিক কলোনি সরকারি প্রাথমিক বিদ্যালয়ের কাছে",
      isUrgent: true,
      status: "open",
      stakeholderId: dpheId,
      upvotes: 21,
      downvotes: 0,
      score: 21,
      photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1000&q=80", // Rural water well
      photoColor: "#0284c7",
      photoTitle: "Bhajanpur Drinking Water",
    },
    {
      id: "f7000000-0000-0000-0000-000000000007",
      authorId: "c5000000-0000-0000-0000-000000000005", // Shahidul (Sadar)
      title: "চাকলাহাট ইউনিয়নে বোরো মৌসুমে সেচ পাম্পের লো-ভোল্টেজ ও বিদ্যুৎ বিভ্রাট",
      body: "পঞ্চগড় সদর উপজেলার চাকলাহাট ইউনিয়নের কৃষি ব্লকে বোরো ধানের আবাদ জোরেশোরে চলছে। তবে প্রতিদিন বিকাল ও রাতে সেচ মৌসুমে মারাত্মক লো-ভোল্টেজ থাকার কারণে গভীর সেচ পাম্পগুলো চালানো যাচ্ছে না। সময়মতো সেচ দিতে না পারলে ধানের ফলনে বিপর্যয় ঘটবে। পল্লী বিদ্যুৎ সমিতির দ্রুত নতুন ট্রান্সফরমার স্থাপন করা জরুরি।",
      categoryId: "agriculture",
      upazilaId: "sadar",
      unionId: "chaklahat",
      lat: 26.312,
      lng: 88.621,
      precise: true,
      landmark: "চাকলাহাট হাই স্কুল সংলগ্ন কৃষি সেচ ব্লক",
      isUrgent: true,
      status: "assigned",
      stakeholderId: palliBidyutId,
      upvotes: 19,
      downvotes: 1,
      score: 18,
      photoUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80", // Agricultural green field
      photoColor: "#65a30d",
      photoTitle: "Chaklahat Paddy Irrigation",
    },
    {
      id: "f8000000-0000-0000-0000-000000000008",
      authorId: "c6000000-0000-0000-0000-000000000006", // Tasnim (Atwari)
      title: "আটোয়ারী রাধানগর বাজার ড্রেনেজ ব্যবস্থার বেহাল দশা ও বর্জ্য অপসারণ",
      body: "আটোয়ারী উপজেলার ব্যস্ততম রাধানগর হাট ও বাজারের ভেতর দিয়ে প্রবাহিত ড্রেনটি সম্পূর্ণ পলিথিন ও ময়লায় ভরে গেছে। বাজারে আসা ক্রেতা ও সাধারণ ব্যবসায়ীদের তীব্র দুর্গন্ধে চরম ভোগান্তি পোহাতে হচ্ছে। নিয়মিত বর্জ্য ব্যবস্থাপনা ও পাকা ড্রেন পুনঃখননের প্রয়োজনীয় উদ্যোগ নেওয়ার জন্য দৃষ্টি আকর্ষণ করছি।",
      categoryId: "environment",
      upazilaId: "atwari",
      unionId: "radhanagar",
      lat: 26.215,
      lng: 88.385,
      precise: true,
      landmark: "রাধানগর কাঁচাবাজারের প্রধান গলির মুখ",
      isUrgent: false,
      status: "under_review",
      stakeholderId: null,
      upvotes: 13,
      downvotes: 0,
      score: 13,
      photoUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1000&q=80", // Marketplace / environment
      photoColor: "#78716c",
      photoTitle: "Radhanagar Bazar Drainage",
    },
    {
      id: "f9000000-0000-0000-0000-000000000009",
      authorId: "c7000000-0000-0000-0000-000000000007", // Mahmudul (Sadar)
      title: "পঞ্চগড় চিনিকল সংলগ্ন সংযোগ সড়কের সংস্কার ও ভারী যান চলাচল নিয়ন্ত্রণ",
      body: "ধাক্কামারা ইউনিয়নের পঞ্চগড় চিনিকল ও রেলগেটমুখী প্রধান সংযোগ সড়কের পিচ উঠে গিয়ে বড় বড় খানাখন্দের সৃষ্টি হয়েছে। আখবাহী ভারী ট্রাক ও ট্রলি চলাচলের কারণে রাস্তাটি এখন চলাচলের অযোগ্য। এলজিইডির আওতায় জরুরি কার্পেটিং ও সংস্কার কাজ শুরু করার জন্য সংশ্লিষ্ট কর্তৃপক্ষের কাছে আকুল আবেদন জানাচ্ছি।",
      categoryId: "roads",
      upazilaId: "sadar",
      unionId: "dhakkamara",
      lat: 26.321,
      lng: 88.542,
      precise: true,
      landmark: "চিনিকল কলোনি মোড় ও রেলক্রসিং লিংক",
      isUrgent: true,
      status: "assigned",
      stakeholderId: lgedId,
      upvotes: 16,
      downvotes: 0,
      score: 16,
      photoUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=1000&q=80", // Industrial / rural road
      photoColor: "#475569",
      photoTitle: "Panchagarh Sugar Mills Road",
    },
  ];

  for (const post of posts) {
    // 1. Process post photo
    const img = await fetchOrFallbackImage(post.photoUrl, post.photoColor, post.photoTitle);
    const mediaId = crypto.randomUUID();

    await db.insert(media).values({
      id: mediaId,
      ownerId: post.authorId,
      mime: "image/webp",
      data: img.data,
      thumb: img.thumb,
      width: img.width,
      height: img.height,
      bytes: img.bytes,
      attachedAt: new Date(),
    });

    // 2. Insert or update Issue
    await db
      .insert(issues)
      .values({
        id: post.id,
        authorId: post.authorId,
        title: post.title,
        body: post.body,
        categoryId: post.categoryId,
        upazilaId: post.upazilaId,
        unionId: post.unionId,
        lat: post.lat,
        lng: post.lng,
        precise: post.precise,
        landmark: post.landmark,
        isUrgent: post.isUrgent,
        status: post.status,
        statusNote: (post as any).statusNote ?? null,
        stakeholderId: post.stakeholderId,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        score: post.score,
      })
      .onConflictDoUpdate({
        target: issues.id,
        set: {
          title: post.title,
          body: post.body,
          status: post.status,
          statusNote: (post as any).statusNote ?? null,
          stakeholderId: post.stakeholderId,
          upvotes: post.upvotes,
          score: post.score,
        },
      });

    // 3. Link media to issue
    await db
      .insert(issueMedia)
      .values({
        issueId: post.id,
        mediaId,
        position: 0,
      })
      .onConflictDoNothing();

    console.log(`   ✓ Issue posted: "${post.title.slice(0, 35)}..." with attached Panchagarh photo`);
  }

  // 4. Seed initial realistic comments
  console.log("4. Seeding community and authority comments...");
  const demoComments = [
    {
      id: "e1000000-0000-0000-0000-000000000001",
      issueId: "f1000000-0000-0000-0000-000000000001", // Tea garden road
      authorId: "a3000000-0000-0000-0000-000000000003", // LGED Engineer
      body: "বিষয়টি আমাদের এলজিইডি পঞ্চগড় দপ্তরের নজরে এসেছে। উপ-সহকারী প্রকৌশলীকে ঘটনাস্থল পরিদর্শন করে তাৎক্ষণিক মাটির কাজের মাধ্যমে সাময়িক যান চলাচল উপযোগী করার নির্দেশ দেওয়া হয়েছে। পূর্ণাঙ্গ সংস্কারের প্রাক্কলন তৈরি করা হচ্ছে।",
    },
    {
      id: "e2000000-0000-0000-0000-000000000002",
      issueId: "f1000000-0000-0000-0000-000000000001",
      authorId: "a2000000-0000-0000-0000-000000000002", // MP Office
      body: "মাননীয় সংসদ সদস্য মহোদয়ের দপ্তর থেকে এলজিইডি পঞ্চগড়কে দ্রুত ব্যবস্থা গ্রহণের জন্য নির্দেশনা পাঠানো হয়েছে। কাজের অগ্রগতি নিয়মিত পর্যবেক্ষণ করা হচ্ছে।",
    },
    {
      id: "e3000000-0000-0000-0000-000000000003",
      issueId: "f3000000-0000-0000-0000-000000000003", // Atwari culvert
      authorId: "c2000000-0000-0000-0000-000000000002", // Salma
      body: "মির্জাপুর বাজারের কালভার্টটি দ্রুত মেরামত হওয়া জরুরি। হাটের দিনগুলোতে কৃষক ভাইদের মালামাল নিয়ে ভীষণ কষ্টে পড়তে হয়। দ্রুত দৃষ্টি আকর্ষণ করছি।",
    },
  ];

  for (const c of demoComments) {
    await db
      .insert(comments)
      .values({
        id: c.id,
        issueId: c.issueId,
        authorId: c.authorId,
        body: c.body,
      })
      .onConflictDoNothing();
  }

  // Update comment counts on issues
  for (const post of posts) {
    await db
      .update(issues)
      .set({
        commentCount: sql`(SELECT count(*)::int FROM nagorik_pg.comments WHERE issue_id = ${post.id} AND hidden_at IS NULL)`,
      })
      .where(eq(issues.id, post.id));
  }

  console.log("\n=======================================================");
  console.log("✓ DEMO SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
  console.log("Accounts created with password: 'NagorikPass123!'");
  console.log("1. Admin:         admin@nagorik.gov.bd (Dr. Tariqul Islam)");
  console.log("2. MP Office:     office@nagorik.gov.bd (Farhana Akhter)");
  console.log("3. Authority:     lged.officer@panchagarh.gov.bd (Engr. Rafiqul Hasan)");
  console.log("4. Citizen:       anamul.tetulia@gmail.com (Anamul Haque, Tetulia)");
  console.log("5. Citizen:       salma.panchagarh@gmail.com (Salma Begum, Sadar)");
  console.log("6. Citizen:       kamrul.atwari@gmail.com (Kamrul Hasan, Atwari)");
  console.log("=======================================================\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
