import type { Metadata } from "next";
import { MapView } from "@/components/map/MapView";
import { getT } from "@/i18n/server";
import { getMapPins } from "@/server/queries/issues";
import { areaName, getAreas, getCategories } from "@/server/queries/reference";

export const metadata: Metadata = { title: "Map" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [{ lang }, areas, categories, pins] = await Promise.all([getT(), getAreas(), getCategories(), getMapPins({})]);
  return (
    <MapView
      pins={pins}
      areas={areas.filter((a) => a.kind === "upazila").map((a) => ({ id: a.id, name: areaName(a, lang) }))}
      categories={categories.map((c) => ({ id: c.id, name: lang === "bn" ? c.nameBn : c.nameEn }))}
    />
  );
}
