"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import Map from "./Map";

export type PlaceValue = { name: string; address: string | null; lat: number | null; lng: number | null };
type Result = { name: string; address: string; lat: number; lng: number };

export default function PlacePicker({ value, onChange }: {
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
}) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

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

  const pick = (v: PlaceValue) => {
    onChange(v);
    setQ("");
    setResults(null);
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
          <div className="min-w-0">
            <div className="truncate font-medium">📍 {value.name}</div>
            {value.address && <div className="truncate text-xs text-ink2">{value.address}</div>}
          </div>
          <button type="button" className="shrink-0 text-sm text-accent-ink" onClick={() => onChange(null)}>
            {t("clear")}
          </button>
        </div>
        {value.lat !== null && value.lng !== null && (
          <Map points={[{ lat: value.lat, lng: value.lng, title: value.name }]} height={160} />
        )}
      </div>
    );
  }

  const query = q.trim();
  const open = query.length >= 2;
  return (
    <div>
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
      {open && (
        <ul className="mt-1 overflow-hidden rounded-xl border border-line bg-surface text-sm">
          {busy && !results?.length && <li className="px-3 py-2 text-muted">{t("searching")}</li>}
          {!busy && results?.length === 0 && <li className="px-3 py-2 text-muted">{t("noResults")}</li>}
          {results?.map((r, i) => (
            <li key={i} className="border-b border-line">
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-wash" onClick={() => pick(r)}>
                <span className="block font-medium">{r.name}</span>
                <span className="block truncate text-xs text-ink2">{r.address}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-ink2 hover:bg-wash"
              onClick={() => pick({ name: query, address: null, lat: null, lng: null })}
            >
              {t("useAsTyped", { q: query })}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
