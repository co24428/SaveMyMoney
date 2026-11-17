"use client";

import { useEffect, useRef, useState } from "react";
import Map, { type MapPoint } from "@/components/Map";
import { Card, ErrorNote, MonthNav, PageTitle, TxRow } from "@/components/ui";
import { useFetch, type Tx } from "@/lib/client";
import { dayLabel, monthRange, thisMonth, todayYmd, weekdayNames, weekdayOf, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

type Located = Tx & { lat: number; lng: number };

const hasSpot = (x: Tx): x is Located => x.lat !== null && x.lng !== null;
/** Oldest first: by date, then time (entries without a time last), then creation order. */
const byTime = (a: Tx, b: Tx) =>
  a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.id - b.id;

export default function MapLogsPage() {
  const { t, lang } = useI18n();
  const query = useQuery();
  const month = validMonth(query.get("m"), thisMonth());
  const range = monthRange(month);
  const d = query.get("d");
  const day = d && d.startsWith(month) && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  const [focus, setFocus] = useState<number | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  const txs = useFetch<Tx[]>(`/api/transactions?from=${range.from}&to=${range.to}`);
  const all = (txs.data ?? []).filter((x) => x.date.startsWith(month)).sort(byTime);
  const located = all.filter(hasSpot);

  const visitsPerDay: Record<string, number> = {};
  for (const x of located) visitsPerDay[x.date] = (visitsPerDay[x.date] ?? 0) + 1;
  const days = Object.keys(visitsPerDay).sort();
  const spotKey = (x: Located) => `${x.lat.toFixed(4)},${x.lng.toFixed(4)}`; // ~10 m grid
  const placeCount = new Set(located.map(spotKey)).size;

  const nameOf = (x: Tx) => x.place_name || x.note || x.category_name || "";
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
  const detail = (x: Tx) =>
    [x.time, x.amount ? won(x.amount) : "₩0", x.note && x.note !== x.place_name ? x.note : null].filter(Boolean).join(" · ");

  // Day: one numbered pin per entry, in time order. Month: one pin per spot.
  let points: MapPoint[];
  let places: { name: string; visits: Located[] }[] = [];
  const dayAll = day ? all.filter((x) => x.date === day) : [];
  const dayLocated = dayAll.filter(hasSpot);
  if (day) {
    points = dayLocated.map((x, i) => ({
      lat: x.lat,
      lng: x.lng,
      title: nameOf(x),
      label: String(i + 1),
      tag: nameOf(x) || undefined,
      popup: [`${i + 1}. ${nameOf(x) || dayLabel(x.date, lang)}`, detail(x)],
    }));
  } else {
    const groups = new globalThis.Map<string, Located[]>();
    for (const x of located) {
      // Repeat visits to the same spot share one pin.
      const k = spotKey(x);
      groups.set(k, [...(groups.get(k) ?? []), x]);
    }
    places = [...groups.values()]
      .map((visits) => ({ name: nameOf(visits.find((v) => v.place_name) ?? visits[0]), visits }))
      .sort((a, b) => b.visits.length - a.visits.length || byTime(a.visits[0], b.visits[0]));
    points = places.map((p) => ({
      lat: p.visits[0].lat,
      lng: p.visits[0].lng,
      title: p.name,
      label: p.visits.length > 1 ? String(p.visits.length) : "",
      tag: p.name || undefined,
      popup: [p.name || t("unnamedPlace"), ...p.visits.map((v) => `${shortDate(v.date)} ${detail(v)}`)],
    }));
  }

  const go = (changes: Record<string, string | null>) => {
    setFocus(null);
    query.set(changes);
  };
  const focusOn = (i: number) => {
    setFocus(i);
    mapBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Keep the selected day visible in the day strip.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [day, days.length]);

  const di = day ? days.indexOf(day) : -1;
  const prevDay = day ? (di === -1 ? days.filter((x) => x < day).at(-1) : days[di - 1]) : undefined;
  const nextDay = day ? (di === -1 ? days.find((x) => x > day) : days[di + 1]) : undefined;
  const weekdays = weekdayNames(lang);
  const today = todayYmd();
  const chip = (active: boolean) =>
    `flex min-w-[3.4rem] shrink-0 flex-col items-center rounded-2xl px-2.5 py-1.5 text-xs ${
      active ? "bg-accent font-semibold text-white shadow-[0_4px_10px_rgba(42,120,214,0.3)]" : "bg-surface text-ink2 shadow-card"
    }`;
  const arrow = "flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink2 hover:bg-wash disabled:opacity-30";

  return (
    <>
      <PageTitle right={<MonthNav month={month} onChange={(m) => go({ m, d: null })} />}>{t("mapLogs")}</PageTitle>

      {txs.error ? (
        <ErrorNote detail={txs.error} className="py-6 text-center" />
      ) : !txs.data ? (
        <p className="py-6 text-center text-sm text-muted">{t("loading")}</p>
      ) : (
        <>
          <div ref={strip} className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 py-1" role="group" aria-label={t("day")}>
            <button className={chip(!day)} aria-pressed={!day} onClick={() => go({ d: null })}>
              <span className="text-sm">{t("wholeMonth")}</span>
              <span>{t("places", { n: placeCount })}</span>
            </button>
            {days.map((x) => (
              <button key={x} className={chip(x === day)} aria-pressed={x === day} aria-label={dayLabel(x, lang)} onClick={() => go({ d: x })}>
                <span className={`text-sm ${x === today ? "underline underline-offset-2" : ""}`}>{Number(x.slice(8))}</span>
                <span>
                  {weekdays[weekdayOf(x)]} · {visitsPerDay[x]}
                </span>
              </button>
            ))}
          </div>

          {day && (
            <div className="mb-2 flex items-center justify-between">
              <button className={arrow} aria-label={t("prevDay")} disabled={!prevDay} onClick={() => prevDay && go({ d: prevDay })}>
                ‹
              </button>
              <span className="font-semibold">{dayLabel(day, lang)}</span>
              <button className={arrow} aria-label={t("nextDay")} disabled={!nextDay} onClick={() => nextDay && go({ d: nextDay })}>
                ›
              </button>
            </div>
          )}

          <div ref={mapBox}>
            {points.length ? (
              <div className="overflow-hidden rounded-[20px] shadow-card">
                <Map points={points} line={!!day} height="min(62vh, 560px)" focus={focus} />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[20px] border border-dashed border-baseline px-6 text-center text-sm text-muted">
                {day ? t("noPlacesDay") : t("noPlacesMonth")}
              </div>
            )}
          </div>

          {day ? (
            <Card className="mt-4">
              {dayAll.length === 0 ? (
                <p className="text-sm text-muted">{t("noEntriesDay")}</p>
              ) : (
                <ul>
                  {dayAll.map((x) => {
                    const n = dayLocated.indexOf(x as Located);
                    return (
                      <li key={x.id} className="flex items-center gap-2">
                        {n >= 0 ? (
                          <button
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-card"
                            aria-label={t("showOnMap", { n: n + 1 })}
                            onClick={() => focusOn(n)}
                          >
                            {n + 1}
                          </button>
                        ) : (
                          <span className="w-7 shrink-0 text-center text-xs text-muted" title={t("noLocation")}>
                            –
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <TxRow tx={x} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ) : (
            places.length > 0 && (
              <Card className="mt-4" title={t("placesThisMonth")}>
                <ul className="divide-y divide-line">
                  {places.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 py-2.5">
                      <button
                        className="min-w-0 flex-1 text-left"
                        aria-label={t("showOnMap", { n: p.name || t("unnamedPlace") })}
                        onClick={() => focusOn(i)}
                      >
                        <span className="block truncate font-medium">📍 {p.name || t("unnamedPlace")}</span>
                        <span className="block text-xs text-ink2">{p.visits.length === 1 ? t("oneVisit") : t("visits", { n: p.visits.length })}</span>
                      </button>
                      <div className="flex max-w-[55%] flex-wrap justify-end gap-1">
                        {[...new Set(p.visits.map((v) => v.date))].map((date) => (
                          <button
                            key={date}
                            className="rounded-full border border-line px-2 py-0.5 text-xs text-ink2 hover:bg-wash"
                            onClick={() => go({ d: date })}
                          >
                            {shortDate(date)}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          )}
        </>
      )}
    </>
  );
}
