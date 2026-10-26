import { z } from "zod";
import { FLAG_REASONS, ISSUE_STATUSES, LIMITS } from "./constants";

/** Messages are stable error CODES, mapped to text in the user's language by the UI. */
const text = (min: number, max: number, minCode: string, maxCode: string) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min, minCode).max(max, maxCode));

/** Multi-line text: keeps single line breaks, collapses runs of blank lines. */
const longText = (min: number, max: number, minCode: string, maxCode: string) =>
  z
    .string()
    .transform((s) =>
      s
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    )
    .pipe(z.string().min(min, minCode).max(max, maxCode));

const uuid = z.string().uuid("invalid_id");

export const emailSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().email("invalid_email").max(160, "invalid_email"));

/** Bangladesh mobile: 01[3-9]XXXXXXXX or +8801[3-9]XXXXXXXX. Stored normalised as +8801XXXXXXXXX. */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const m = /^(?:\+?88)?(01[3-9]\d{8})$/.exec(digits);
  return m ? `+88${m[1]}` : null;
}

export const registerSchema = z.object({
  name: text(LIMITS.nameMin, LIMITS.nameMax, "name_short", "name_long"),
  email: emailSchema,
  password: z.string().min(1, "password_required").max(200, "password_long"),
  upazilaId: z.string().min(1, "area_required"),
  unionId: z.string().optional().transform((v) => (v ? v : null)),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "terms_required" }) }),
  next: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password_required").max(200),
  next: z.string().optional(),
});

export const issueSchema = z.object({
  title: text(LIMITS.titleMin, LIMITS.titleMax, "title_short", "title_long"),
  body: longText(LIMITS.bodyMin, LIMITS.bodyMax, "body_short", "body_long"),
  categoryId: z.string().min(1, "category_required"),
  upazilaId: z.string().min(1, "area_required"),
  unionId: z.string().optional().transform((v) => (v ? v : null)),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  hasPin: z.string().optional(),
  landmark: z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.landmarkMax) || null),
  isUrgent: z.string().optional().transform((v) => v === "on"),
  anonymous: z.string().optional().transform((v) => v === "on"),
  mediaIds: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").filter(Boolean) : []))
    .pipe(z.array(uuid).max(LIMITS.maxImages, "too_many_images")),
});

export const commentSchema = z.object({
  issueId: uuid,
  body: longText(1, LIMITS.commentMax, "comment_empty", "comment_long"),
});

export const flagSchema = z.object({
  targetType: z.enum(["issue", "comment"]),
  targetId: uuid,
  reason: z.enum(FLAG_REASONS),
  note: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().slice(0, 300) || null),
});

export const profileSchema = z.object({
  name: text(LIMITS.nameMin, LIMITS.nameMax, "name_short", "name_long"),
  bio: z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(LIMITS.bioMax, "bio_long"))
    .transform((s) => s || null),
  upazilaId: z.string().min(1, "area_required"),
  unionId: z.string().optional().transform((v) => (v ? v : null)),
  avatarMediaId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
});

export const noteSchema = (min = 0) => longText(min, LIMITS.noteMax, "note_short", "note_long");

export const triageSchema = z.object({
  issueId: uuid,
  action: z.enum(["review", "assign", "reject", "reopen"]),
  stakeholderId: z.string().uuid("stakeholder_required").optional().or(z.literal("")).transform((v) => v || null),
  deadlineDays: z.coerce.number().int().min(1).max(60).optional(),
  note: z.string().optional().transform((s) => (s ?? "").trim()),
});

export const statusSchema = z.enum(ISSUE_STATUSES);

export const stakeholderSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  nameEn: text(3, 120, "name_short", "name_long"),
  nameBn: z.string().optional().transform((s) => (s ?? "").trim().slice(0, 120) || null),
  kind: z.enum(["government", "local_government", "utility", "public_service", "other"]),
  upazilaId: z.string().optional().transform((v) => (v ? v : null)),
  phone: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim() || null)
    .refine((v) => v === null || normalizeBdPhone(v) !== null || /^[0-9+\-\s()]{5,20}$/.test(v), "invalid_phone"),
  email: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().toLowerCase() || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, "invalid_email"),
});
