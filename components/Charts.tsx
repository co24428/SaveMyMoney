"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactWon, monthLabel, monthShort, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { name: string; value: number; color: string }[];
  title: (label: string) => string;
};

function Tip({ active, label, payload, title }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-ink">{title(String(label))}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-ink2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-ink">{won(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const axis = { fontSize: 11, fill: "var(--muted)" };
const cursorLine = { stroke: "var(--baseline)", strokeWidth: 1 };

function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const { t } = useI18n();
  return (
    <details className="mt-2 text-xs text-ink2">
      <summary className="cursor-pointer select-none text-muted">{t("viewTable")}</summary>
      <table className="mt-2 w-full tabular-nums">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            {head.map((h, i) => (
              <th key={h} className={`py-1 font-medium ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-line last:border-0">
              {r.map((c, i) => (
                <td key={i} className={`py-1 ${i ? "text-right" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function TrendChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const { t, lang } = useI18n();
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink2">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-income" />
          {t("income")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-expense" />
          {t("expense")}
        </span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="month" tickFormatter={(m: string) => monthShort(m, lang)} tick={axis} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} interval="preserveStartEnd" minTickGap={4} />
            <YAxis width={44} tickFormatter={(v: number) => compactWon(v, lang)} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--wash)" }} content={<Tip title={(m) => monthLabel(m, lang)} />} />
            <Bar dataKey="income" name={t("income")} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
            <Bar dataKey="expense" name={t("expense")} fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView
        head={[t("month"), t("income"), t("expense")]}
        rows={data.map((d) => [d.month, won(d.income), won(d.expense)])}
      />
    </div>
  );
}

export function DailyChart({ data }: { data: { date: string; expense: number }[] }) {
  const { t, lang } = useI18n();
  const fmt = (date: string) =>
    new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
  return (
    <div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={(d: string) => String(Number(d.slice(8)))} tick={axis} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} interval={4} />
            <YAxis width={44} tickFormatter={(v: number) => compactWon(v, lang)} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--wash)" }} content={<Tip title={fmt} />} />
            <Bar dataKey="expense" name={t("expense")} fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView
        head={[t("day"), t("expense")]}
        rows={data.filter((d) => d.expense > 0).map((d) => [fmt(d.date), won(d.expense)])}
      />
    </div>
  );
}

/** Running total of spending this month against last month, by day of month. */
export function PaceChart({ current, previous, currentLabel, previousLabel, upToDay }: {
  current: { date: string; expense: number }[];
  previous: { date: string; expense: number }[];
  currentLabel: string;
  previousLabel: string;
  /** Last day of the current month that has happened (today for the current month). */
  upToDay: number;
}) {
  const { t, lang } = useI18n();
  const days = Math.max(current.length, previous.length);
  const running = (rows: { expense: number }[]) => {
    const out: number[] = [];
    rows.forEach((r, i) => out.push((out[i - 1] ?? 0) + r.expense));
    return out;
  };
  const curSum = running(current);
  const prevSum = running(previous);
  const data = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    cur: i < current.length && i < upToDay ? curSum[i] : null,
    prev: i < previous.length ? prevSum[i] : null,
  }));
  const last = data[Math.min(upToDay, current.length) - 1];
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-ink2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded bg-expense" />
          {currentLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded" style={{ background: "var(--series-muted)" }} />
          {previousLabel}
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} ticks={[1, 8, 15, 22, 29].filter((d) => d <= days)} />
            <YAxis width={44} tickFormatter={(v: number) => compactWon(v, lang)} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip cursor={cursorLine} content={<Tip title={(d) => t("paceDay", { n: d })} />} />
            <Line dataKey="prev" name={previousLabel} stroke="var(--series-muted)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} connectNulls />
            <Line
              dataKey="cur"
              name={currentLabel}
              stroke="var(--series-2)"
              strokeWidth={2}
              isAnimationActive={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === (last ? last.day - 1 : -1) && props.cx != null && props.cy != null ? (
                  <circle key="end" cx={props.cx} cy={props.cy} r={4} fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} />
                ) : (
                  <g key={`d${props.index}`} />
                )
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
