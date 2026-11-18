"use client";

import { useEffect, useState } from "react";
import { Card, ErrorNote, MonthNav, NetAmount, PageTitle, Summary, TxRow, iconBtn, sumBy } from "@/components/ui";
import { ListSkeleton } from "@/components/motion";
import { useFetch, type Meta, type Tx } from "@/lib/client";
import { dayLabel, monthRange, thisMonth, todayYmd } from "@/lib/format";
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
  const [panel, setPanel] = useState(false);
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
  const today = todayYmd();

  const cat = meta.data?.categories.find((c) => String(c.id) === category);
  const who = meta.data?.people.find((p) => String(p.id) === person);
  const ev = meta.data?.events.find((e) => String(e.id) === event);
  const active = [
    cat && { key: "cat", label: `${cat.icon} ${cat.name}` },
    who && { key: "person", label: `👥 ${who.name}` },
    ev && { key: "event", label: `🏷 ${ev.name}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const chip = (on: boolean) =>
    `press shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${on ? "bg-ink text-page" : "bg-surface text-ink2 shadow-card hover:text-ink hover:shadow-md"}`;
  const select = "field !py-2 !text-sm";

  return (
    <>
      <PageTitle right={!all && <MonthNav month={month} onChange={(m) => query.set({ m })} />}>{t("history")}</PageTitle>

      <div className="mb-2 flex gap-2">
        <input
          type="search"
          className="field !rounded-2xl !border-0 shadow-card transition-shadow focus:shadow-md"
          placeholder={`🔍 ${t("searchEntries")}`}
          aria-label={t("search")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className={`${iconBtn} !h-[42px] !w-[42px] ${panel || active.length ? "!bg-accent-soft !text-accent-ink" : ""}`}
          aria-label={t("filters")}
          aria-expanded={panel}
          onClick={() => setPanel((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </button>
      </div>

      {panel && (
        <Card className="sheet-up mb-2 space-y-2 !p-3">
          <select className={select} aria-label={t("category")} value={category} onChange={(e) => query.set({ cat: e.target.value || null })}>
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
          <select className={select} aria-label={t("withWho")} value={person} onChange={(e) => query.set({ person: e.target.value || null })}>
            <option value="">{t("anyPerson")}</option>
            {meta.data?.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className={select} aria-label={t("event")} value={event} onChange={(e) => query.set({ event: e.target.value || null })}>
            <option value="">{t("anyEvent")}</option>
            {meta.data?.events.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Card>
      )}

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 py-1">
        {(["", "expense", "income"] as const).map((k) => (
          <button key={k} className={chip(kind === k)} aria-pressed={kind === k} onClick={() => query.set({ kind: k || null, cat: null })}>
            {k ? t(k) : t("all")}
          </button>
        ))}
        <button className={chip(all)} aria-pressed={all} onClick={() => query.set({ all: all ? null : "1" })}>
          {t("allTime")}
        </button>
        {active.map((a) => (
          <button key={a.key} className={`${chip(false)} !bg-accent-soft !text-accent-ink`} onClick={() => query.set({ [a.key]: null })} aria-label={`${t("clear")} ${a.label}`}>
            {a.label} ✕
          </button>
        ))}
      </div>

      <Card className="mb-3 !py-3">
        <Summary income={sumBy(rows, "income")} expense={sumBy(rows, "expense")} count={rows.length} />
      </Card>

      {txs.error ? (
        <ErrorNote detail={txs.error} className="py-6 text-center" />
      ) : !txs.data ? (
        <Card>
          <ListSkeleton rows={6} />
        </Card>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t("noEntries")}</p>
      ) : (
        <Card className="stagger !px-3 !py-1" key={params.toString()}>
          {[...byDate.entries()].map(([date, list]) => (
            <div key={date} className="border-b border-line py-1 last:border-0">
              <div className="flex items-baseline justify-between px-1 pb-0.5 pt-2 text-xs font-semibold text-ink2">
                <span>
                  {all && `${date.slice(0, 4)} · `}
                  {dayLabel(date, lang)}
                  {date === today && ` · ${t("today")}`}
                </span>
                <NetAmount income={sumBy(list, "income")} expense={sumBy(list, "expense")} />
              </div>
              {list.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
