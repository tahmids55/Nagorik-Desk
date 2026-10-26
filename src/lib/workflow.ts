import type { IssueStatus } from "./constants";

/**
 * Issue lifecycle (who may move an issue where):
 *
 *   open ──review──▶ under_review ──assign──▶ assigned ──acknowledge──▶ in_progress ──proof──▶ resolved
 *     │                  │                       │  ▲                       │                     │
 *     └──────reject──────┴───────reject──────────┘  └── reassign (office)   └──refer back─▶ under_review
 *                                                                            resolved ──"still a problem" (reporter)──▶ assigned
 *   rejected / resolved ──reopen (office)──▶ under_review
 */
export type OfficeAction = "review" | "assign" | "reject" | "reopen";
export type AuthorityAction = "acknowledge" | "progress" | "resolve" | "refer_back" | "request_extension";

const OFFICE: Record<OfficeAction, { from: readonly IssueStatus[]; to: IssueStatus }> = {
  review: { from: ["open"], to: "under_review" },
  assign: { from: ["open", "under_review", "assigned"], to: "assigned" },
  reject: { from: ["open", "under_review", "assigned", "in_progress"], to: "rejected" },
  reopen: { from: ["rejected", "resolved"], to: "under_review" },
};

const AUTHORITY: Record<AuthorityAction, { from: readonly IssueStatus[]; to: IssueStatus | null }> = {
  acknowledge: { from: ["assigned"], to: "in_progress" },
  progress: { from: ["assigned", "in_progress"], to: null },
  resolve: { from: ["assigned", "in_progress"], to: "resolved" },
  refer_back: { from: ["assigned", "in_progress"], to: "under_review" },
  request_extension: { from: ["assigned", "in_progress"], to: null },
};

export function officeTransition(action: OfficeAction, from: IssueStatus): IssueStatus | null {
  const rule = OFFICE[action];
  return rule.from.includes(from) ? rule.to : null;
}

export function authorityTransition(action: AuthorityAction, from: IssueStatus): { allowed: boolean; to: IssueStatus | null } {
  const rule = AUTHORITY[action];
  return { allowed: rule.from.includes(from), to: rule.to };
}

/** Actions the office can offer for an issue in the given state (drives the UI). */
export const officeActionsFor = (status: IssueStatus): OfficeAction[] =>
  (Object.keys(OFFICE) as OfficeAction[]).filter((a) => OFFICE[a].from.includes(status));

export const authorityActionsFor = (status: IssueStatus): AuthorityAction[] =>
  (Object.keys(AUTHORITY) as AuthorityAction[]).filter((a) => AUTHORITY[a].from.includes(status));
