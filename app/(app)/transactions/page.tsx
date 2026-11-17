"use client";

import { useEffect, useState } from "react";
import { Card, MonthNav, PageTitle, Totals, TxRow, sumBy } from "@/components/ui";
import { useFetch, type Meta, type Tx } from "@/lib/client";
import { dayLabel, monthRange, thisMonth } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const query = useQuery();
  const month = validMonth(query.get("m"), thisMonth());
  const all = query.get("all") === "1";
  const kind = query.get("kind") ?? "";
  const category = query.get("cat") ?? "";
  const person = query.get("person") ?? "";
  const event = query.get("event") ?? "";
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const meta = useFetch<Meta>("/api/meta");
  const params = new URLSearchParams();
  if (!all) {
    const r = monthRange(month);
    params.set("from", r.from);
    params.set("to", r.to);
  }
  if (kind) params.set("kind", kind);
  if (category) params.set("category", category);
  if (person) params.set("person", person);
  if (event) params.set("event", event);
  if (q) params.set("q", q);
  const txs = useFetch<Tx[]>(`/api/transactions?${params}`);

  const rows = txs.data ?? [];
  const byDate = new Map<string, Tx[]>();
  for (const tx of rows) byDate.set(tx.date, [...(byDate.get(tx.date) ?? []), tx]);

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent-soft font-semibold text-accent-ink" : "border-line bg-surface text-ink2"}`;

  return (
    <>
      <PageTitle>{t("history")}</PageTitle>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {all ? <span className="py-1.5 font-semibold">{t("allTime")}</span> : <MonthNav month={month} onChange={(m) => query.set({ m })} />}
        <button className={pill(all)} aria-pressed={all} onClick={() => query.set({ all: all ? null : "1" })}>
          {t("allTime")}
        </button>
      </div>

      <div className="mb-3 space-y-2">
        <input
          type="search"
          className="field"
          placeholder={t("searchEntries")}
          aria-label={t("search")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(["", "expense", "income"] as const).map((k) => (
            <button key={k} className={pill(kind === k)} aria-pressed={kind === k} onClick={() => query.set({ kind: k || null, cat: null })}>
              {k ? t(k) : t("all")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select className="field !px-2 !text-sm" aria-label={t("category")} value={category} onChange={(e) => query.set({ cat: e.target.value || null })}>
            <option value="">{t("anyCategory")}</option>
            {meta.data?.categories
              .filter((c) => !kind || c.kind === kind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                  {!kind ? ` (${t(c.kind)})` : ""}
                </option>
              ))}
          </select>
          <select className="field !px-2 !text-sm" aria-label={t("withWho")} value={person} onChange={(e) => query.set({ person: e.target.value || null })}>
            <option value="">{t("anyPerson")}</option>
            {meta.data?.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className="field !px-2 !text-sm" aria-label={t("event")} value={event} onChange={(e) => query.set({ event: e.target.value || null })}>
            <option value="">{t("anyEvent")}</option>
            {meta.data?.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <Totals income={sumBy(rows, "income")} expense={sumBy(rows, "expense")} />
          <span className="text-xs text-muted">{t("entries", { n: rows.length })}</span>
        </div>
        {txs.error ? (
          <p className="py-6 text-center text-sm text-critical">{t("error")}</p>
        ) : !txs.data ? (
          <p className="py-6 text-center text-sm text-muted">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("noEntries")}</p>
        ) : (
          [...byDate.entries()].map(([date, list]) => (
            <div key={date} className="mt-3 first:mt-0">
              <div className="flex items-baseline justify-between px-1 text-xs text-ink2">
                <span className="font-semibold">
                  {all && `${date.slice(0, 4)} · `}
                  {dayLabel(date, lang)}
                </span>
              </div>
              {list.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
