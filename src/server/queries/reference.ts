import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { areas, categories, stakeholders } from "../db/schema";

export type AreaDTO = { id: string; kind: "upazila" | "union"; parentId: string | null; nameEn: string; nameBn: string; lat: number; lng: number };
export type CategoryDTO = { id: string; nameEn: string; nameBn: string; icon: string };
export type StakeholderDTO = { id: string; nameEn: string; nameBn: string | null; kind: string; upazilaId: string | null; active: boolean };

/** Reference data changes rarely, so keep it in memory for a few minutes per server instance. */
const TTL = 5 * 60_000;
const store = new Map<string, { at: number; value: unknown }>();

async function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  store.set(key, { at: Date.now(), value });
  return value;
}

export const invalidateReference = (key?: string) => (key ? store.delete(key) : store.clear());

export const getAreas = () =>
  memo<AreaDTO[]>("areas", async () =>
    (await db().select().from(areas).orderBy(asc(areas.kind), asc(areas.nameEn))) as AreaDTO[],
  );

export const getCategories = () =>
  memo<CategoryDTO[]>("categories", () =>
    db()
      .select({ id: categories.id, nameEn: categories.nameEn, nameBn: categories.nameBn, icon: categories.icon })
      .from(categories)
      .orderBy(asc(categories.sort)),
  );

export const getStakeholders = (opts: { activeOnly?: boolean } = {}) =>
  memo<StakeholderDTO[]>(`stakeholders:${opts.activeOnly ? "active" : "all"}`, async () => {
    const q = db()
      .select({
        id: stakeholders.id,
        nameEn: stakeholders.nameEn,
        nameBn: stakeholders.nameBn,
        kind: stakeholders.kind,
        upazilaId: stakeholders.upazilaId,
        active: stakeholders.active,
      })
      .from(stakeholders);
    return opts.activeOnly ? q.where(eq(stakeholders.active, true)).orderBy(asc(stakeholders.nameEn)) : q.orderBy(asc(stakeholders.nameEn));
  });

export const areaName = (a: { nameEn: string; nameBn: string } | undefined, lang: "en" | "bn") =>
  a ? (lang === "bn" ? a.nameBn : a.nameEn) : "";
