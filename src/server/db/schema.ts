import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Everything lives in its own Postgres schema so this app can share a Neon
 * database with other projects without touching their tables.
 */
export const app = pgSchema("nagorik_pg");

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ───────────────────────── Reference data ─────────────────────────

export const areas = app.table(
  "areas",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    parentId: text("parent_id"),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => [check("areas_kind_chk", sql`${t.kind} in ('upazila','union')`), index("areas_parent_idx").on(t.parentId)],
);

export const categories = app.table("categories", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameBn: text("name_bn").notNull(),
  icon: text("icon").notNull(),
  sort: smallint("sort").notNull().default(0),
});

/** Government offices / service bodies that fix issues (LGED, PDB, DPHE ...). */
export const stakeholders = app.table(
  "stakeholders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn"),
    kind: text("kind").notNull().default("government"),
    /** null = covers the whole constituency */
    upazilaId: text("upazila_id").references(() => areas.id),
    phone: text("phone"),
    email: text("email"),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("stakeholders_name_upazila_uq").on(t.nameEn, sql`coalesce(${t.upazilaId}, '')`)],
);

// ───────────────────────── Identity ─────────────────────────

export const users = app.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    phone: text("phone"),
    phoneVerifiedAt: ts("phone_verified_at"),
    /** Beta: NID is never collected until an authorised provider is configured. */
    nidVerifiedAt: ts("nid_verified_at"),
    nidHmac: text("nid_hmac"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("citizen"),
    officeTitle: text("office_title"),
    stakeholderId: uuid("stakeholder_id").references(() => stakeholders.id),
    status: text("status").notNull().default("active"),
    statusReason: text("status_reason"),
    upazilaId: text("upazila_id").references(() => areas.id),
    unionId: text("union_id").references(() => areas.id),
    bio: text("bio"),
    avatarMediaId: uuid("avatar_media_id"),
    lang: text("lang").notNull().default("en"),
    totpSecretEnc: text("totp_secret_enc"),
    totpEnabledAt: ts("totp_enabled_at"),
    recoveryCodes: jsonb("recovery_codes").$type<string[]>(),
    termsAcceptedAt: ts("terms_accepted_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at"),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_phone_uq").on(t.phone).where(sql`${t.phone} is not null`),
    uniqueIndex("users_nid_uq").on(t.nidHmac).where(sql`${t.nidHmac} is not null`),
    index("users_role_idx").on(t.role),
    check("users_role_chk", sql`${t.role} in ('citizen','authority','office','admin')`),
    check("users_status_chk", sql`${t.status} in ('active','suspended','deleted')`),
    check("users_lang_chk", sql`${t.lang} in ('en','bn')`),
    check(
      "users_authority_stakeholder_chk",
      sql`${t.role} <> 'authority' or ${t.stakeholderId} is not null`,
    ),
  ],
);

export const sessions = app.table(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastUsedAt: ts("last_used_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    /** null until the second step (authenticator code) has been passed */
    mfaVerifiedAt: ts("mfa_verified_at"),
    userAgent: text("user_agent"),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** One-time codes: email verification, password reset, mobile verification. */
export const verificationCodes = app.table(
  "verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    target: text("target").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: smallint("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("codes_user_purpose_idx").on(t.userId, t.purpose),
    check("codes_purpose_chk", sql`${t.purpose} in ('email_verify','password_reset','phone_verify')`),
  ],
);

// ───────────────────────── Content ─────────────────────────

export const media = app.table(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    /** legacy in-database bytes; null when the image lives on ImageKit */
    data: bytea("data"),
    thumb: bytea("thumb"),
    url: text("url"),
    thumbUrl: text("thumb_url"),
    providerFileId: text("provider_file_id"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    /** set once the image is attached to an issue / update / avatar */
    attachedAt: ts("attached_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("media_owner_idx").on(t.ownerId), index("media_orphan_idx").on(t.createdAt).where(sql`${t.attachedAt} is null`)],
);

export const issues = app.table(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: bigserial("seq", { mode: "number" }).notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    upazilaId: text("upazila_id")
      .notNull()
      .references(() => areas.id),
    unionId: text("union_id").references(() => areas.id),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    /** true = citizen dropped a pin; false = approximate (area centre) */
    precise: boolean("precise").notNull().default(false),
    landmark: text("landmark"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    anonymous: boolean("anonymous").notNull().default(false),
    status: text("status").notNull().default("open"),
    statusNote: text("status_note"),
    stakeholderId: uuid("stakeholder_id").references(() => stakeholders.id),
    assignedAt: ts("assigned_at"),
    acknowledgedAt: ts("acknowledged_at"),
    dueAt: ts("due_at"),
    resolvedAt: ts("resolved_at"),
    /** citizen confirmed the fix */
    confirmedAt: ts("confirmed_at"),
    reopenCount: smallint("reopen_count").notNull().default(0),
    mpPriority: boolean("mp_priority").notNull().default(false),
    mpCommitment: text("mp_commitment"),
    mpTargetDate: date("mp_target_date", { mode: "string" }),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    score: integer("score").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    hiddenAt: ts("hidden_at"),
    hiddenReason: text("hidden_reason"),
    hiddenBy: uuid("hidden_by").references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("issues_seq_uq").on(t.seq),
    index("issues_feed_idx").on(t.hiddenAt, t.createdAt),
    index("issues_score_idx").on(t.score),
    index("issues_status_idx").on(t.status),
    index("issues_upazila_idx").on(t.upazilaId),
    index("issues_category_idx").on(t.categoryId),
    index("issues_stakeholder_idx").on(t.stakeholderId),
    index("issues_author_idx").on(t.authorId),
    index("issues_geo_idx").on(t.lat, t.lng),
    check(
      "issues_status_chk",
      sql`${t.status} in ('open','under_review','assigned','in_progress','resolved','rejected')`,
    ),
    check("issues_title_len", sql`char_length(${t.title}) between 8 and 100`),
    check("issues_body_len", sql`char_length(${t.body}) between 20 and 1500`),
    check("issues_lat_chk", sql`${t.lat} between -90 and 90`),
    check("issues_lng_chk", sql`${t.lng} between -180 and 180`),
  ],
);

export const issueMedia = app.table(
  "issue_media",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.issueId, t.mediaId] })],
);

export const votes = app.table(
  "votes",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.issueId, t.userId] }),
    index("votes_user_idx").on(t.userId),
    check("votes_value_chk", sql`${t.value} in (-1, 1)`),
  ],
);

/** Issues a signed-in user has saved to read later. Private to the owner. */
export const bookmarks = app.table(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.issueId] }), index("bookmarks_user_created_idx").on(t.userId, t.createdAt)],
);

export const comments = app.table(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    hiddenAt: ts("hidden_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("comments_issue_idx").on(t.issueId, t.createdAt),
    check("comments_len", sql`char_length(${t.body}) between 1 and 500`),
  ],
);

/** Public timeline: status changes, official notes, assignments, proof of work. */
export const issueUpdates = app.table(
  "issue_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    actorRole: text("actor_role").notNull(),
    /** Office / authority name shown publicly instead of a personal name. */
    actorLabel: text("actor_label").notNull(),
    kind: text("kind").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    body: text("body"),
    stakeholderId: uuid("stakeholder_id").references(() => stakeholders.id),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("updates_issue_idx").on(t.issueId, t.createdAt)],
);

export const updateMedia = app.table(
  "update_media",
  {
    updateId: uuid("update_id")
      .notNull()
      .references(() => issueUpdates.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.updateId, t.mediaId] })],
);

// ───────────────────────── Moderation, notifications, audit ─────────────────────────

export const flags = app.table(
  "flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: ts("resolved_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("flags_once_uq").on(t.targetType, t.targetId, t.reporterId),
    index("flags_status_idx").on(t.status, t.createdAt),
    check("flags_target_chk", sql`${t.targetType} in ('issue','comment')`),
    check("flags_status_chk", sql`${t.status} in ('open','dismissed','actioned')`),
  ],
);

export const notifications = app.table(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "cascade" }),
    /** Parameters only. Text is rendered in the reader's language at display time. */
    data: jsonb("data").$type<Record<string, string | number | null>>(),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.createdAt), index("notif_unread_idx").on(t.userId).where(sql`${t.readAt} is null`)],
);

export const auditLog = app.table(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)],
);

export const rateLimits = app.table("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: ts("window_start").notNull().defaultNow(),
  lockedUntil: ts("locked_until"),
});
