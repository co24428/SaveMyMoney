"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import Map from "./Map";

export type PlaceValue = { name: string; address: string | null; lat: number | null; lng: number | null };
type Result = { name: string; address: string; lat: number; lng: number };

export const EMPTY_PLACE: PlaceValue = { name: "", address: null, lat: null, lng: null };
const fmt = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

/** Accepts "37.5665, 126.9780" (also separated by a space). */
function parseCoords(text: string): { lat: number; lng: number } | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/**
 * "Where" in two independent parts: a free-text name (any nickname), and an
 * exact location stored as latitude / longitude.
 */
export default function PlacePicker({ value, onChange }: {
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
}) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [coordDraft, setCoordDraft] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [note, setNote] = useState("");
  const seq = useRef(0);
  const hasCoords = value.lat !== null && value.lng !== null;

  // Debounced search; stale responses are dropped.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api<{ results: Result[] }>(`/api/places?lang=${lang}&q=${encodeURIComponent(query)}`);
        if (mine === seq.current) setResults(r.results);
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [q, lang]);

  const setSpot = (lat: number, lng: number, address: string | null = null) => {
    setNote("");
    setCoordDraft(null);
    onChange({ ...value, lat, lng, address });
  };

  const pickResult = (r: Result) => {
    setNote("");
    setCoordDraft(null);
    onChange({ name: value.name.trim() ? value.name : r.name, address: r.address || null, lat: r.lat, lng: r.lng });
    setQ("");
    setResults(null);
  };

  function useCurrent() {
    if (!navigator.geolocation) return setNote(t("locationFailed"));
    setGeoBusy(true);
    setNote("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setSpot(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGeoBusy(false);
        setNote(t("locationFailed"));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function commitCoords() {
    if (coordDraft === null) return;
    const text = coordDraft.trim();
    if (!text) {
      setCoordDraft(null);
      setNote("");
      return onChange({ ...value, lat: null, lng: null, address: null });
    }
    const parsed = parseCoords(text);
    if (parsed) setSpot(parsed.lat, parsed.lng);
    else setNote(t("coordsInvalid"));
  }

  const query = q.trim();
  const small = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink2 disabled:opacity-50";
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-xs text-ink2">{t("placeName")}</div>
        <input
          className="field"
          placeholder={t("placeNamePlaceholder")}
          aria-label={t("placeName")}
          maxLength={200}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>

      <div>
        <div className="mb-1 text-xs text-ink2">{t("location")}</div>
        <input
          className="field"
          placeholder={t("searchPlace")}
          aria-label={t("searchPlace")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        {query.length >= 2 && (
          <ul className="mt-1 overflow-hidden rounded-xl border border-line bg-surface text-sm">
            {busy && !results?.length && <li className="px-3 py-2 text-muted">{t("searching")}</li>}
            {!busy && results?.length === 0 && <li className="px-3 py-2 text-muted">{t("noResults")}</li>}
            {results?.map((r, i) => (
              <li key={i} className="border-b border-line last:border-0">
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-wash" onClick={() => pickResult(r)}>
                  <span className="block font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-ink2">{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={small} onClick={useCurrent} disabled={geoBusy}>
            {geoBusy ? t("locating") : `◎ ${t("currentLocation")}`}
          </button>
          {!hasCoords && !mapOpen && (
            <button type="button" className={small} onClick={() => setMapOpen(true)}>
              🗺 {t("pickOnMap")}
            </button>
          )}
          {hasCoords && (
            <button
              type="button"
              className={small}
              onClick={() => {
                setCoordDraft(null);
                setNote("");
                setMapOpen(false);
                onChange({ ...value, lat: null, lng: null, address: null });
              }}
            >
              {t("clearLocation")}
            </button>
          )}
        </div>

        {(hasCoords || mapOpen) && (
          <div className="mt-2 space-y-2">
            <Map
              points={hasCoords ? [{ lat: value.lat!, lng: value.lng!, title: value.name }] : []}
              height={220}
              onPick={(lat, lng) => setSpot(lat, lng)}
            />
            <p className="text-xs text-muted">{t("mapHint")}</p>
            <div>
              <div className="mb-1 text-xs text-ink2">{t("coordinates")}</div>
              <input
                className="field tabular-nums"
                inputMode="text"
                placeholder="37.566500, 126.978000"
                aria-label={t("coordinates")}
                value={coordDraft ?? (hasCoords ? fmt(value.lat!, value.lng!) : "")}
                onChange={(e) => setCoordDraft(e.target.value)}
                onBlur={commitCoords}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCoords();
                  }
                }}
              />
            </div>
            {value.address && <p className="text-xs text-ink2">{value.address}</p>}
          </div>
        )}
        {note && (
          <p role="alert" className="mt-2 text-sm text-critical">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
