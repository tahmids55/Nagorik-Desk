/**
 * Free, keyless raster tiles. Google roadmap/hybrid tiles (Bengali labels when lang is bn),
 * with OpenStreetMap as the fallback when a tile request fails.
 */
export type TileStyle = "map" | "satellite";

export const TILE_STYLES: TileStyle[] = ["map", "satellite"];

export const TILE_LABELS: Record<"en" | "bn", Record<TileStyle, string>> = {
  en: { map: "Map", satellite: "Satellite" },
  bn: { map: "মানচিত্র", satellite: "স্যাটেলাইট" },
};

const GOOGLE_ATTRIBUTION = 'Map data &copy; <a href="https://maps.google.com/" target="_blank" rel="noreferrer">Google</a>';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function tileConfig(style: TileStyle, lang: string) {
  const hl = lang === "bn" ? "bn" : "en";
  const lyrs = style === "satellite" ? "y" : "m";
  return {
    url: `https://mt{s}.google.com/vt/lyrs=${lyrs}&hl=${hl}&x={x}&y={y}&z={z}`,
    subdomains: "0123",
    maxZoom: 20,
    attribution: GOOGLE_ATTRIBUTION,
  };
}

export const OSM_CONFIG = { url: OSM_URL, maxZoom: 19, attribution: OSM_ATTRIBUTION };

/** Area strictly bounding Panchagarh-1 [south, west], [north, east]. */
export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [26.05, 88.15],
  [26.75, 88.90],
];

/**
 * Creates an inverted GeoJSON polygon: an outer world ring with the
 * Panchagarh-1 boundary as a hole cutout so outside areas can be masked.
 */
export function createInverseMask(geoJson: any) {
  try {
    const feat = geoJson.type === "FeatureCollection" ? geoJson.features[0] : geoJson;
    const coords = feat?.geometry?.coordinates;
    if (!coords || !coords[0]) return null;

    const worldRing = [
      [-180, -85],
      [180, -85],
      [180, 85],
      [-180, 85],
      [-180, -85],
    ];

    return {
      type: "Feature",
      properties: { role: "mask" },
      geometry: {
        type: "Polygon",
        coordinates: [worldRing, coords[0]],
      },
    };
  } catch {
    return null;
  }
}

/** CSS variable carrying the status colour, so markers follow the light and dark themes. */
export const STATUS_VAR: Record<string, string> = {
  open: "var(--status-new)",
  under_review: "var(--status-new)",
  assigned: "var(--status-assigned)",
  in_progress: "var(--status-inprogress)",
  resolved: "var(--status-done)",
  rejected: "var(--ink-muted)",
};

export const OVERDUE_VAR = "var(--status-urgent)";
