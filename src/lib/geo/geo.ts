export type LatLng = { lat: number; lng: number };
type Ring = number[][]; // [lng, lat][]

/** Ray-casting point-in-polygon. Ring coordinates are GeoJSON order: [lng, lat]. */
export function pointInRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > lat !== yj! > lat && lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

/** Polygon = outer ring + optional holes. */
export function pointInPolygon(lat: number, lng: number, polygon: Ring[]): boolean {
  if (!polygon[0] || !pointInRing(lat, lng, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) if (pointInRing(lat, lng, polygon[h]!)) return false;
  return true;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Degrees of latitude / longitude that cover roughly `meters` at a given latitude (for cheap bounding boxes). */
export function boxAround(p: LatLng, meters: number) {
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { minLat: p.lat - dLat, maxLat: p.lat + dLat, minLng: p.lng - dLng, maxLng: p.lng + dLng };
}
