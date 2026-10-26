import upazilaGeo from "../../../public/geo/upazilas.json";
import { haversineMeters, pointInPolygon } from "./geo";

type Feature = { properties: { id: string }; geometry: { coordinates: number[][][] } };
const features = (upazilaGeo as unknown as { features: Feature[] }).features;

/** Which upazila contains this point (by official polygon), or null. */
export function detectUpazila(lat: number, lng: number): string | null {
  for (const f of features) if (pointInPolygon(lat, lng, f.geometry.coordinates)) return f.properties.id;
  return null;
}

/** Nearest union (by centre point) among the given candidates. */
export function nearestArea<T extends { lat: number; lng: number }>(p: { lat: number; lng: number }, candidates: T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = haversineMeters(p, c);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}
