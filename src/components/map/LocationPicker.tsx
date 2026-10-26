"use client";

import { Locate } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { useI18n } from "@/i18n/client";
import { insideConstituency } from "@/lib/geo/boundary";
import { LayerSwitcher } from "./LayerSwitcher";
import { useLeafletMap } from "./useLeafletMap";

export type Pin = { lat: number; lng: number };

/** Tap the map (or drag the pin, or use GPS) to say exactly where the problem is. */
export function LocationPicker({ value, onChange }: { value: Pin | null; onChange: (p: Pin | null) => void }) {
  const { t } = useI18n();
  const { ref, map, L, style, setStyle } = useLeafletMap({ zoom: 11 });
  const marker = useRef<Leaflet.Marker | null>(null);
  const [outside, setOutside] = useState(false);
  const [gpsError, setGpsError] = useState(false);

  const place = (p: Pin) => {
    if (!insideConstituency(p.lat, p.lng)) {
      setOutside(true);
      return false;
    }
    setOutside(false);
    onChange(p);
    return true;
  };
  // Leaflet handlers are registered once, so they call the latest closure through refs.
  const placeRef = useRef(place);
  placeRef.current = place;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Keep the marker in sync with `value`
  useEffect(() => {
    if (!map || !L) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const m = L.marker([value.lat, value.lng], {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({ className: "ngk-picker-root", html: '<span class="ngk-picker-pin"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      }).addTo(map);
      m.on("dragend", () => {
        const ll = m.getLatLng();
        if (!placeRef.current({ lat: ll.lat, lng: ll.lng })) {
          const v = valueRef.current;
          if (v) m.setLatLng([v.lat, v.lng]);
        }
      });
      marker.current = m;
      if (!map.getBounds().contains([value.lat, value.lng])) map.panTo([value.lat, value.lng]);
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
  }, [map, L, value]);

  useEffect(() => {
    if (!map) return;
    const onClick = (e: Leaflet.LeafletMouseEvent) => placeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  const locate = () => {
    setGpsError(false);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (place(p)) map?.setView([p.lat, p.lng], 16);
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-[3px] border border-line">
        <div ref={ref} className="h-[300px] w-full bg-neutral-fill" role="application" aria-label={t("picker_aria")} />
        <LayerSwitcher value={style} onChange={setStyle} className="right-3 top-3" />
        <button type="button" onClick={locate} className="btn-secondary btn-sm absolute bottom-6 left-3 z-[1000] rounded-[3px] border border-line bg-surface">
          <Locate className="h-4 w-4" aria-hidden="true" />
          {t("use_my_location")}
        </button>
      </div>
      {value ? <p className="text-xs text-ok">{t("pin_set")}</p> : <p className="hint !mt-0">{t("pin_hint")}</p>}
      {outside && (
        <p role="alert" className="field-error !mt-0">
          {t("err_outside_boundary")}
        </p>
      )}
      {gpsError && (
        <p role="alert" className="field-error !mt-0">
          {t("gps_failed")}
        </p>
      )}
    </div>
  );
}
