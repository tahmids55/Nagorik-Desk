import boundaryJson from "../../../public/geo/boundary.json";
import { pointInPolygon } from "./geo";

type Poly = number[][][];
const polygon = (boundaryJson as { features: { geometry: { coordinates: Poly } }[] }).features[0]!.geometry.coordinates;

/** True when the point lies inside the Panchagarh-1 constituency boundary. */
export function insideConstituency(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && pointInPolygon(lat, lng, polygon);
}
