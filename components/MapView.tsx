"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  lat: number;
  lng: number;
  title: string;
  /** Short text inside the pin (an order number or a day). */
  label?: string;
  /** Always-visible name tag beside the pin. */
  tag?: string;
  /** Lines shown when the pin is tapped. Defaults to the title. */
  popup?: string[];
};

/** Builds DOM nodes with textContent so user text is never parsed as HTML. */
function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SEOUL: [number, number] = [37.5665, 126.978];

/**
 * OpenStreetMap view. Points are numbered and, with `line`, joined in order.
 * With `onPick` the map becomes a picker: tapping it, or dragging the pin,
 * reports the exact coordinates.
 */
export default function MapView({ points, line = false, height = 220, onPick, focus }: {
  points: MapPoint[];
  line?: boolean;
  height?: number | string;
  /** Index of a point to zoom to and open. */
  focus?: number | null;
  onPick?: (lat: number, lng: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
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
    if (!box.current) return;
    const map = L.map(box.current, { scrollWheelZoom: false, fadeAnimation: false }).setView(SEOUL, 11);
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
    map.closePopup();
    layer.clearLayers();
    markersRef.current = [];
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
          html: el("div", "map-pin", p.label ?? ""),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      }).addTo(layer);
      markersRef.current.push(marker);
      if (p.tag) {
        marker.bindTooltip(el("span", "", p.tag), {
          permanent: true,
          direction: "right",
          offset: [12, 0],
          className: "map-tag",
        });
      }
      if (picker) {
        marker.on("dragend", () => {
          const at = marker.getLatLng();
          pickRef.current?.(at.lat, at.lng);
        });
      } else if (p.popup?.length || p.title) {
        const content = el("div", "map-popup");
        (p.popup ?? [p.title]).forEach((line, j) => content.appendChild(el("div", j ? "" : "font-semibold", line)));
        marker.bindPopup(content);
      }
    });
    if (latlngs.length > 1) {
      // Extra room on the right for the name tags drawn beside each pin.
      const right = points.some((p) => p.tag) ? 110 : 30;
      map.fitBounds(L.latLngBounds(latlngs), { paddingTopLeft: [30, 30], paddingBottomRight: [right, 30], maxZoom: 16 });
    } else if (!picker || !map.getBounds().contains(latlngs[0]) || map.getZoom() < 14) {
      map.setView(latlngs[0], Math.max(map.getZoom(), 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, line, picker]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = focus == null ? undefined : markersRef.current[focus];
    if (!map || !marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 16));
    marker.openPopup();
  }, [focus, key]);

  return <div ref={box} style={{ height }} className="w-full overflow-hidden rounded-xl border border-line" />;
}
