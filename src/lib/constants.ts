/** Shared, client-safe constants. */

export const ROLES = ["citizen", "authority", "office", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles that must use two-step login (authenticator app). */
export const STAFF_ROLES: readonly Role[] = ["authority", "office", "admin"];

export const ISSUE_STATUSES = [
  "open",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const UPDATE_KINDS = [
  "status",
  "note",
  "assignment",
  "proof",
  "extension_requested",
  "extension_approved",
  "extension_declined",
  "reopened",
  "priority",
  "referred_back",
] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const FLAG_REASONS = ["spam", "abuse", "personal_data", "false_info", "other"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const SORTS = ["hot", "top", "new"] as const;
export type Sort = (typeof SORTS)[number];

export const LANGS = ["en", "bn"] as const;
export type Lang = (typeof LANGS)[number];

export const LIMITS = {
  titleMin: 8,
  titleMax: 100,
  bodyMin: 20,
  bodyMax: 1500,
  commentMax: 500,
  landmarkMax: 120,
  maxImages: 3,
  maxProofImages: 5,
  bioMax: 200,
  nameMin: 2,
  nameMax: 80,
  passwordMin: 10,
  noteMax: 600,
  pageSize: 12,
} as const;

/** Working-day deadline defaults (Bangladesh working week: Sunday to Thursday). */
export const DEADLINE_DAYS = { normal: 10, urgent: 3 } as const;

/** "Still a problem" window after a fix is reported. */
export const REOPEN_WINDOW_DAYS = 30;

export const STATUS_ORDER: Record<IssueStatus, number> = {
  open: 0,
  under_review: 1,
  assigned: 2,
  in_progress: 3,
  resolved: 4,
  rejected: 5,
};

/** Panchagarh-1 centre, used when no better location is known. */
export const MAP_CENTER = { lat: 26.39, lng: 88.46 } as const;
