import "server-only";
import { type Tx } from "../db/client";
import { issueUpdates, updateMedia } from "../db/schema";
import type { Role, UpdateKind } from "@/lib/constants";

export async function addUpdate(
  tx: Tx,
  p: {
    issueId: string;
    actorId: string;
    actorRole: Role;
    /** English fallback label; the UI localises by role / stakeholder */
    actorLabel: string;
    kind: UpdateKind;
    fromStatus?: string | null;
    toStatus?: string | null;
    body?: string | null;
    stakeholderId?: string | null;
    meta?: Record<string, unknown>;
    mediaIds?: string[];
  },
): Promise<string> {
  const [row] = await tx
    .insert(issueUpdates)
    .values({
      issueId: p.issueId,
      actorId: p.actorId,
      actorRole: p.actorRole,
      actorLabel: p.actorLabel,
      kind: p.kind,
      fromStatus: p.fromStatus ?? null,
      toStatus: p.toStatus ?? null,
      body: p.body || null,
      stakeholderId: p.stakeholderId ?? null,
      meta: p.meta,
    })
    .returning({ id: issueUpdates.id });
  const id = row!.id;
  if (p.mediaIds?.length) {
    await tx.insert(updateMedia).values(p.mediaIds.map((mediaId) => ({ updateId: id, mediaId })));
  }
  return id;
}
