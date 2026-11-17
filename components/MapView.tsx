"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; title: string; label?: string };

const SEOUL: [number, number] = [37.5665, 126.978];

/**
 * OpenStreetMap view. Points are numbered and, with `line`, joined in order.
 * With `onPick` the map becomes a picker: tapping it, or dragging the pin,
 * reports the exact coordinates.
 */
export default function MapView({ points, line = false, height = 220, onPick }: {
  points: MapPoint[];
  line?: boolean;
  height?: number;
  onPick?: (lat: number, lng: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  const key = JSON.stringify(points);
  const picker = !!onPick;

  useEffect(() => {
    pickRef.current = onPick;
  });

  // Create the map once; it survives point changes so zoom and position are kept.
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false }).setView(SEOUL, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!points.length) return;
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    if (line && latlngs.length > 1) {
      L.polyline(latlngs, { color: "#2a78d6", weight: 2, opacity: 0.7, dashArray: "4 6" }).addTo(layer);
    }
    points.forEach((p, i) => {
      const marker = L.marker(latlngs[i], {
        title: p.title,
        draggable: picker,
        icon: L.divIcon({
          className: "",
          html: `<div class="map-pin">${p.label ? Number(p.label) || "" : ""}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      }).addTo(layer);
      if (picker) {
        marker.on("dragend", () => {
          const at = marker.getLatLng();
          pickRef.current?.(at.lat, at.lng);
        });
      } else if (p.title) {
        const text = document.createElement("span");
        text.textContent = p.title; // textContent: place names are never parsed as HTML
        marker.bindPopup(text);
      }
    });
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 16 });
    } else if (!picker || !map.getBounds().contains(latlngs[0]) || map.getZoom() < 14) {
      map.setView(latlngs[0], Math.max(map.getZoom(), 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, line, picker]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-xl border border-line" />;
}
