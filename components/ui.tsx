"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CountUp } from "./motion";
import { addMonths, monthLabel, thisMonth, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Tx } from "@/lib/client";

export function Card({ title, action, children, className = "" }: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] bg-surface p-4 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[13px] font-semibold text-ink2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Error line that includes the server's message, so problems can be reported. */
export function ErrorNote({ detail, className = "" }: { detail?: string | null; className?: string }) {
  const { t } = useI18n();
  return (
    <p role="alert" className={`text-sm text-critical ${className}`}>
      {t("error")}
      {detail && <span className="mt-1 block break-words text-xs text-ink2">{detail}</span>}
    </p>
  );
}

export const iconBtn =
  "press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink2 shadow-card hover:text-ink hover:shadow-md";

export function SettingsButton() {
  const { t } = useI18n();
  return (
    <Link href="/settings" aria-label={t("settings")} className={`${iconBtn} group`}>
      <svg className="transition-transform duration-500 group-hover:rotate-90" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" />
      </svg>
    </Link>
  );
}

/** Page header: title on the left; optional controls and the settings button on the right. */
export function PageTitle({ children, right, settings = true }: {
  children: React.ReactNode;
  right?: React.ReactNode;
  settings?: boolean;
}) {
  const scrolled = useScrolled();
  return (
    <div
      className={`sticky top-0 z-20 -mx-4 mb-3 flex min-h-14 items-center justify-between gap-3 px-4 py-2 transition-[background-color,box-shadow,backdrop-filter] duration-300 md:top-[62px] ${
        scrolled ? "bg-page/85 shadow-[0_1px_0_var(--line)] backdrop-blur-md" : ""
      }`}
    >
      <h1 className={`truncate font-bold tracking-tight transition-[font-size] duration-300 ${scrolled ? "text-[18px]" : "text-[22px]"}`}>{children}</h1>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        {settings && <SettingsButton />}
      </div>
    </div>
  );
}

/** True once the page is scrolled a little (for the condensed sticky header). */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

/** Compact month switcher pill: ‹ Nov 2026 › */
export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { t, lang } = useI18n();
  const btn = "press flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-ink2 hover:bg-wash hover:text-ink";
  const label = new Intl.DateTimeFormat(lang, { year: "numeric", month: "short" }).format(new Date(`${month}-01T00:00:00`));
  return (
    <div className="flex items-center gap-1.5">
      {month !== thisMonth() && (
        <button className="press rounded-full px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-soft" onClick={() => onChange(thisMonth())}>
          {t("today")}
        </button>
      )}
      <div className="flex items-center rounded-full bg-surface shadow-card">
        <button className={btn} aria-label={t("prevMonth")} onClick={() => onChange(addMonths(month, -1))}>
          ‹
        </button>
        <span key={month} className="bump min-w-[4.8rem] text-center text-sm font-semibold tabular-nums" aria-label={monthLabel(month, lang)}>
          {label}
        </span>
        <button className={btn} aria-label={t("nextMonth")} onClick={() => onChange(addMonths(month, 1))}>
          ›
        </button>
      </div>
    </div>
  );
}

/** Emoji icon on a soft tint that is fixed per category. */
export function CategoryTile({ icon, id, kind, size = "md" }: {
  icon: string | null;
  id: number | null;
  kind?: Tx["kind"];
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-12 w-12 rounded-2xl text-[22px]" : size === "sm" ? "h-8 w-8 rounded-[10px] text-base" : "h-10 w-10 rounded-xl text-lg";
  const bg = id === null ? "var(--wash)" : `var(--tint-${id % 8})`;
  return (
    <span className={`flex shrink-0 items-center justify-center ${dims}`} style={{ background: bg }} aria-hidden>
      {icon || (kind === "income" ? "＋" : "·")}
    </span>
  );
}

export function Amount({ kind, amount, className = "" }: { kind: Tx["kind"]; amount: number; className?: string }) {
  return (
    <span className={`tabular-nums ${amount === 0 ? "text-muted" : kind === "income" ? "text-good" : "text-ink"} ${className}`}>
      {amount === 0 ? "" : kind === "income" ? "+" : "−"}
      {won(amount)}
    </span>
  );
}

export function TxRow({ tx, index }: { tx: Tx; index?: number }) {
  const { t } = useI18n();
  const title = tx.note || tx.place_name || tx.category_name || t("uncategorized");
  const place = tx.place_name
    ? tx.place_name
    : tx.lat !== null
      ? (tx.place_address ?? `${tx.lat.toFixed(4)}, ${tx.lng?.toFixed(4)}`)
      : null;
  const sub = [
    tx.category_name && tx.category_name !== title ? tx.category_name : null,
    place && place !== title ? `📍 ${place}` : null,
    tx.people.length ? `👥 ${tx.people.map((p) => p.name).join(", ")}` : null,
    tx.event_name && `🏷 ${tx.event_name}`,
  ].filter(Boolean);
  return (
    <Link href={`/edit/${tx.id}`} className="press group flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-wash active:scale-[0.98]">
      <span className="relative">
        <span className="block transition-transform duration-200 group-hover:scale-105">
          <CategoryTile icon={tx.category_icon} id={tx.category_id} kind={tx.kind} />
        </span>
        {index !== undefined && (
          <span className="absolute -left-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {index}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold transition-colors group-hover:text-accent-ink">{title}</span>
        {sub.length > 0 && <span className="block truncate text-xs text-ink2">{sub.join(" · ")}</span>}
      </span>
      <span className="shrink-0 text-right">
        <Amount kind={tx.kind} amount={tx.amount} className="block text-[15px] font-semibold" />
        <span className="block text-xs text-muted">
          {tx.receipt_path && "🧾 "}
          {tx.amount === 0 && tx.kind === "expense" ? t("treated") : tx.time}
        </span>
      </span>
    </Link>
  );
}

/** Ranked list with a thin single-hue bar under each row. */
export function RankBars({ rows, empty }: {
  rows: { key: string | number; label: string; total: number; hint?: string; tile?: React.ReactNode }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="stagger space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3">
          {r.tile}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {r.label}
                {r.hint && <span className="ml-1.5 text-xs text-muted">{r.hint}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{won(r.total)}</span>
            </div>
            <div className="mt-1.5 h-[5px] rounded-full bg-wash">
              <div className="grow-x h-[5px] rounded-full bg-accent" style={{ width: `${Math.max((r.total / max) * 100, 1.5)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Three-figure summary: spent / earned / count. */
export function Summary({ income, expense, count }: { income: number; expense: number; count?: number }) {
  const { t } = useI18n();
  const cell = "flex flex-col items-center gap-0.5 text-[11px] text-muted";
  return (
    <div className={`grid ${count === undefined ? "grid-cols-2" : "grid-cols-3"} divide-x divide-line`}>
      <div className={cell}>
        {t("spent")}
        <b className="text-[15px] font-semibold text-ink tabular-nums">
          <CountUp value={expense} format={won} />
        </b>
      </div>
      <div className={cell}>
        {t("earned")}
        <b className="text-[15px] font-semibold text-good tabular-nums">
          <CountUp value={income} format={won} />
        </b>
      </div>
      {count !== undefined && (
        <div className={cell}>
          {t("entriesLabel")}
          <b className="text-[15px] font-semibold text-ink tabular-nums">
            <CountUp value={count} format={String} />
          </b>
        </div>
      )}
    </div>
  );
}

/** Signed day total: −₩12,000 / +₩3,200,000 / ₩0 */
export function NetAmount({ income, expense, className = "" }: { income: number; expense: number; className?: string }) {
  const net = income - expense;
  return (
    <span className={`tabular-nums ${net > 0 ? "text-good" : net < 0 ? "text-ink" : "text-muted"} ${className}`}>
      {net > 0 ? "+" : net < 0 ? "−" : ""}
      {won(Math.abs(net))}
    </span>
  );
}

export function Totals({ income, expense }: { income: number; expense: number }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="text-ink2">
        {t("expense")} <b className="font-semibold text-ink tabular-nums">{won(expense)}</b>
      </span>
      <span className="text-ink2">
        {t("income")} <b className="font-semibold text-good tabular-nums">{won(income)}</b>
      </span>
    </div>
  );
}

export const sumBy = (txs: Tx[], kind: Tx["kind"]) =>
  txs.reduce((s, x) => (x.kind === kind ? s + x.amount : s), 0);
