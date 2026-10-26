"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./leaflet-overrides.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { MAP_CENTER } from "@/lib/constants";
import { MAP_BOUNDS, OSM_CONFIG, createInverseMask, tileConfig, type TileStyle } from "@/lib/maps/tiles";

export type LeafletLib = typeof Leaflet;

/**
 * Creates a Leaflet map on the client only (Leaflet touches `window`, so it is imported inside the effect).
 * Handles the tile layer (Google tiles, OpenStreetMap on error) and the optional boundary overlays.
 */
export function useLeafletMap({ zoom, boundary = true, upazilas = false }: { zoom: number; boundary?: boolean; upazilas?: boolean }) {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Leaflet.Map | null>(null);
  const [L, setL] = useState<LeafletLib | null>(null);
  const [style, setStyle] = useState<TileStyle>("map");
  const tiles = useRef<Leaflet.TileLayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    (async () => {
      const lib = ((await import("leaflet")) as unknown as { default: LeafletLib }).default;
      (window as unknown as { L: LeafletLib }).L = lib;
      if (cancelled || !ref.current) return;
      const m = lib.map(ref.current, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom,
        minZoom: 10,
        maxZoom: 20,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false,
      });
      lib.control.zoom({ position: "topleft" }).addTo(m);
      lib.control.attribution({ prefix: false, position: "bottomright" }).addTo(m);
      created = m;

      if (upazilas) {
        try {
          const res = await fetch("/geo/upazilas.json");
          if (res.ok && !cancelled) {
            const data = await res.json();
            lib.geoJSON(data, { interactive: false, style: () => ({ className: "ngk-upazila" }) }).addTo(m);
          }
        } catch {
          /* optional overlay */
        }
      }

      if (boundary) {
        try {
          const res = await fetch("/geo/boundary.json");
          if (res.ok && !cancelled) {
            const data = await res.json();
            // Solid outer mask covering everything except Panchagarh-1
            const mask = createInverseMask(data);
            if (mask) {
              lib.geoJSON(mask as any, { interactive: false, style: () => ({ className: "ngk-outer-mask" }) }).addTo(m);
            }
            lib.geoJSON(data, { interactive: false, style: () => ({ className: "ngk-boundary" }) }).addTo(m);
          }
        } catch {
          /* optional overlay */
        }
      }

      setL(lib);
      setMap(m);
    })();
    return () => {
      cancelled = true;
      created?.remove();
      tiles.current = null;
      setMap(null);
    };
    // The map is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)build the tile layer when the style or language changes.
  useEffect(() => {
    if (!map || !L) return;
    const cfg = tileConfig(style, lang);
    const layer = L.tileLayer(cfg.url, { subdomains: cfg.subdomains, maxZoom: cfg.maxZoom, attribution: cfg.attribution });
    let fellBack = false;
    layer.on("tileerror", () => {
      if (fellBack) return;
      fellBack = true;
      layer.setUrl(OSM_CONFIG.url);
      layer.options.maxZoom = OSM_CONFIG.maxZoom;
      layer.options.subdomains = "abc";
      map.attributionControl?.removeAttribution(cfg.attribution);
      map.attributionControl?.addAttribution(OSM_CONFIG.attribution);
    });
    layer.addTo(map);
    layer.bringToBack();
    tiles.current = layer;
    return () => {
      map.removeLayer(layer);
      if (fellBack) map.attributionControl?.removeAttribution(OSM_CONFIG.attribution);
    };
  }, [map, L, style, lang]);

  return { ref, map, L, style, setStyle };
}
