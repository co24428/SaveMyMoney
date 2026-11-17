"use client";

import Link from "next/link";
import { compactWon, addMonths, monthLabel, thisMonth, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Tx } from "@/lib/client";

export function Card({ title, action, children, className = "" }: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{children}</h1>
      {right}
    </div>
  );
}

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { t, lang } = useI18n();
  const btn = "flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink2 hover:bg-wash";
  return (
    <div className="flex items-center gap-1">
      <button className={btn} aria-label="Previous month" onClick={() => onChange(addMonths(month, -1))}>
        ‹
      </button>
      <span className="min-w-[8.5rem] text-center font-semibold">{monthLabel(month, lang)}</span>
      <button className={btn} aria-label="Next month" onClick={() => onChange(addMonths(month, 1))}>
        ›
      </button>
      {month !== thisMonth() && (
        <button
          className="ml-1 rounded-full border border-line px-3 py-1 text-xs text-ink2 hover:bg-wash"
          onClick={() => onChange(thisMonth())}
        >
          {t("today")}
        </button>
      )}
    </div>
  );
}

export function Amount({ kind, amount, className = "" }: { kind: Tx["kind"]; amount: number; className?: string }) {
  return (
    <span className={`tabular-nums ${kind === "income" ? "text-good" : "text-ink"} ${className}`}>
      {kind === "income" ? "+" : "−"}
      {won(amount)}
    </span>
  );
}

export function TxRow({ tx, index }: { tx: Tx; index?: number }) {
  const { t } = useI18n();
  const title = tx.note || tx.category_name || t("uncategorized");
  const sub = [
    tx.note ? tx.category_name : null,
    tx.place_name && `📍 ${tx.place_name}`,
    tx.people.length ? `👥 ${tx.people.map((p) => p.name).join(", ")}` : null,
    tx.event_name && `🏷 ${tx.event_name}`,
  ].filter(Boolean);
  return (
    <Link href={`/edit/${tx.id}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-wash rounded-lg">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wash text-lg">
        {tx.category_icon || (tx.kind === "income" ? "＋" : "•")}
        {index !== undefined && (
          <span className="absolute -left-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {index}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {sub.length > 0 && <span className="block truncate text-xs text-ink2">{sub.join(" · ")}</span>}
      </span>
      <span className="shrink-0 text-right">
        <Amount kind={tx.kind} amount={tx.amount} className="block font-semibold" />
        <span className="block text-xs text-muted">
          {tx.receipt_path && "🧾 "}
          {tx.time}
        </span>
      </span>
    </Link>
  );
}

/** Ranked list with a thin single-hue bar under each row. */
export function RankBars({ rows, empty }: {
  rows: { key: string | number; label: string; total: number; hint?: string }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {r.label}
              {r.hint && <span className="ml-1.5 text-xs text-muted">{r.hint}</span>}
            </span>
            <span className="shrink-0 font-medium tabular-nums">{won(r.total)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-wash">
            <div
              className="h-1.5 rounded-full bg-accent"
              style={{ width: `${Math.max((r.total / max) * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Totals({ income, expense }: { income: number; expense: number }) {
  const { t, lang } = useI18n();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="text-ink2">
        {t("expense")} <b className="font-semibold text-ink tabular-nums">{won(expense)}</b>
      </span>
      <span className="text-ink2">
        {t("income")} <b className="font-semibold text-good tabular-nums">{won(income)}</b>
      </span>
      <span className="sr-only">{compactWon(income - expense, lang)}</span>
    </div>
  );
}

export const sumBy = (txs: Tx[], kind: Tx["kind"]) =>
  txs.reduce((s, x) => (x.kind === kind ? s + x.amount : s), 0);
