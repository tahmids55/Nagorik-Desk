import type { Role } from "@/lib/constants";

/**
 * One place that defines who may do what. Every server action and page guard
 * goes through `can()` so there is a single rule set to review.
 *
 * Separation of duties:
 *  - office (MP office) triages, assigns and responds, but can NOT hide content or edit votes.
 *  - admin moderates content and manages accounts, but can NOT assign, respond or change issue status.
 *  - authority officers only work on issues assigned to their own office.
 */
export const PERMISSIONS = {
  "issue:create": ["citizen", "authority", "office", "admin"],
  "issue:vote": ["citizen", "authority", "office", "admin"],
  "comment:create": ["citizen", "authority", "office", "admin"],
  "flag:create": ["citizen", "authority", "office", "admin"],
  "issue:triage": ["office"],
  "issue:work": ["authority"],
  "stakeholder:manage": ["office", "admin"],
  "authority:appoint": ["office", "admin"],
  "office:view": ["office", "admin"],
  "authority:view": ["authority"],
  "moderate": ["admin"],
  "users:manage": ["admin"],
  "audit:view": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
