import type { IssueStatus, Role } from "./constants";

export type VoteValue = -1 | 0 | 1;

export type IssueCardDTO = {
  id: string;
  seq: number;
  title: string;
  body: string;
  categoryId: string;
  upazilaId: string;
  unionId: string | null;
  lat: number;
  lng: number;
  precise: boolean;
  landmark: string | null;
  isUrgent: boolean;
  status: IssueStatus;
  stakeholder: { id: string; nameEn: string; nameBn: string | null } | null;
  dueAt: string | null;
  overdue: boolean;
  resolvedAt: string | null;
  confirmed: boolean;
  mpPriority: boolean;
  mpCommitment: string | null;
  mpTargetDate: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  createdAt: string;
  /** `id` and `avatarMediaId` are null for anonymous posts */
  author: { id: string | null; name: string; avatarMediaId: string | null; role: Role | null; anonymous: boolean };
  isMine: boolean;
  myVote: VoteValue;
  images: string[];
  hidden: boolean;
};

export type TimelineEntryDTO = {
  id: string;
  kind: string;
  actorRole: string;
  actorLabel: string;
  stakeholder: { nameEn: string; nameBn: string | null } | null;
  fromStatus: string | null;
  toStatus: string | null;
  body: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  images: string[];
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarMediaId: string | null; role: Role };
  mine: boolean;
};

export type MapPinDTO = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  precise: boolean;
  status: IssueStatus;
  categoryId: string;
  upazilaId: string;
  score: number;
  isUrgent: boolean;
  overdue: boolean;
  createdAt: string;
  /** absolute thumbnail URL (ImageKit) or `/api/media/<id>?s=thumb`; null when the issue has no image */
  imageUrl: string | null;
};
