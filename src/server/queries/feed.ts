import "server-only";
import type { Lang } from "@/lib/constants";
import type { IssueCardDTO } from "@/lib/types";
import { listIssues, type FeedFilters, type Viewer } from "./issues";
import { areaName, getAreas, getCategories } from "./reference";

export type FeedItem = IssueCardDTO & {
  labels: { area: string; category: string; categoryIcon: string; stakeholder: string | null };
};

/** Attach display names (in the reader's language) so client components don't need the reference tables. */
export async function decorate(items: IssueCardDTO[], lang: Lang): Promise<FeedItem[]> {
  const [areas, cats] = await Promise.all([getAreas(), getCategories()]);
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const catById = new Map(cats.map((c) => [c.id, c]));
  return items.map((i) => {
    const up = areaName(areaById.get(i.upazilaId), lang);
    const un = i.unionId ? areaName(areaById.get(i.unionId), lang) : "";
    const cat = catById.get(i.categoryId);
    return {
      ...i,
      labels: {
        area: un ? `${un}, ${up}` : up,
        category: cat ? (lang === "bn" ? cat.nameBn : cat.nameEn) : i.categoryId,
        categoryIcon: cat?.icon ?? "Ellipsis",
        stakeholder: i.stakeholder ? (lang === "bn" && i.stakeholder.nameBn ? i.stakeholder.nameBn : i.stakeholder.nameEn) : null,
      },
    };
  });
}

export async function loadFeed(filters: FeedFilters, viewer: Viewer, lang: Lang): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const { items, hasMore } = await listIssues(filters, viewer);
  return { items: await decorate(items, lang), hasMore };
}
