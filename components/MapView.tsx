"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; title: string; label?: string };

/** OpenStreetMap view. Points are numbered and, with `line`, joined in order. */
export default function MapView({ points, line = false, height = 220 }: {
  points: MapPoint[];
  line?: boolean;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(points);

  useEffect(() => {
    if (!el.current || !points.length) return;
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    if (line && latlngs.length > 1) {
      L.polyline(latlngs, { color: "#2a78d6", weight: 2, opacity: 0.7, dashArray: "4 6" }).addTo(map);
    }
    points.forEach((p, i) => {
      const text = document.createElement("span");
      text.textContent = p.title; // textContent: place names are never parsed as HTML
      L.marker(latlngs[i], {
        title: p.title,
        icon: L.divIcon({
          className: "",
          html: `<div class="map-pin">${p.label ? Number(p.label) || "" : ""}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
        .bindPopup(text)
        .addTo(map);
    });
    if (latlngs.length === 1) map.setView(latlngs[0], 16);
    else map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 16 });
    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, line]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-xl border border-line" />;
}
