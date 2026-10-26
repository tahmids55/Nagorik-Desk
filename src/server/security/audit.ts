import "server-only";
import { db, type Tx } from "../db/client";
import { auditLog } from "../db/schema";

type AuditInput = {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  /** Never put contact details, passwords, codes or tokens in here. */
  meta?: Record<string, unknown>;
};

/** Append-only (enforced by a database trigger). Pass `tx` to make it part of a transaction. */
export async function audit(input: AuditInput, tx?: Tx): Promise<void> {
  await (tx ?? db()).insert(auditLog).values({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    meta: input.meta,
  });
}
