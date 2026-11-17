"use client";

import Link from "next/link";
import Map from "@/components/Map";
import { Card, ErrorNote, MonthNav, NetAmount, PageTitle, Summary, TxRow, sumBy } from "@/components/ui";
import { useFetch, type Tx } from "@/lib/client";
import { compactWon, dayLabel, monthRange, thisMonth, todayYmd, weekdayNames, weekdayOf } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

/** 0 = nothing spent, 1-4 = light sky to deep blue. Square-root scale so one big day doesn't flatten the rest. */
function heatLevel(expense: number, max: number): number {
  if (expense <= 0 || max <= 0) return 0;
  const r = Math.sqrt(expense / max);
  return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4;
}

export default function CalendarPage() {
  const { t, lang } = useI18n();
  const query = useQuery();
  const today = todayYmd();
  const month = validMonth(query.get("m"), thisMonth());
  const range = monthRange(month);
  const d = query.get("d");
  const selected = d && d.startsWith(month) ? d : today.startsWith(month) ? today : null;

  const txs = useFetch<Tx[]>(`/api/transactions?from=${range.from}&to=${range.to}`);
  const rows = txs.data?.filter((x) => x.date.startsWith(month)) ?? [];
  const perDay: Record<string, { expense: number; income: number; count: number }> = {};
  for (const tx of rows) {
    perDay[tx.date] ??= { expense: 0, income: 0, count: 0 };
    perDay[tx.date][tx.kind] += tx.amount;
    perDay[tx.date].count += 1;
  }
  const max = Math.max(0, ...Object.values(perDay).map((x) => x.expense));

  const cells: (string | null)[] = [
    ...Array<null>(weekdayOf(range.from)).fill(null),
    ...Array.from({ length: range.days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  // Oldest first, so the numbered pins follow the order of the day.
  const dayTxs = selected ? rows.filter((x) => x.date === selected).reverse() : [];
  const pinNumber = new globalThis.Map<number, number>();
  const points = dayTxs
    .filter((x) => x.lat !== null && x.lng !== null)
    .map((x, i) => {
      pinNumber.set(x.id, i + 1);
      return { lat: x.lat!, lng: x.lng!, title: x.place_name ?? x.note ?? "", label: String(i + 1), tag: x.place_name || undefined };
    });

  return (
    <>
      <PageTitle right={<MonthNav month={month} onChange={(m) => query.set({ m, d: null })} />}>{t("calendar")}</PageTitle>

      <Card className="mb-3 !py-3">
        <Summary income={sumBy(rows, "income")} expense={sumBy(rows, "expense")} />
      </Card>

      <Card className="!p-2.5">
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
          {weekdayNames(lang).map((w) => (
            <div key={w} className="pb-1.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const sums = perDay[date];
            const level = heatLevel(sums?.expense ?? 0, max);
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => query.set({ d: date })}
                aria-pressed={isSelected}
                aria-label={dayLabel(date, lang)}
                className={`relative flex min-h-[3.4rem] flex-col items-center rounded-xl pt-1 text-[13px] transition-shadow ${
                  isSelected ? "z-10 shadow-[0_0_0_2.5px_var(--accent-ink),0_3px_8px_rgba(0,0,0,0.15)]" : isToday ? "shadow-[inset_0_0_0_1.5px_var(--ink)]" : "hover:bg-wash"
                }`}
                style={level ? { background: `var(--heat-${level})`, color: level === 4 ? "var(--heat-ink-4)" : undefined } : undefined}
              >
                <span className={isToday ? "font-bold" : ""}>{Number(date.slice(8))}</span>
                {sums?.expense ? (
                  <span className="whitespace-nowrap text-[9.5px] leading-tight tabular-nums opacity-90">{compactWon(sums.expense, lang)}</span>
                ) : null}
                {sums && !sums.expense && !sums.income ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-baseline" aria-hidden /> : null}
                {sums?.income ? <span className="absolute bottom-1.5 h-[5px] w-[5px] rounded-full bg-good ring-1 ring-surface" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-1 px-1 text-[10.5px] text-muted">
          {t("heatLess")}
          {[1, 2, 3, 4].map((l) => (
            <span key={l} className="h-2 w-3.5 rounded-sm" style={{ background: `var(--heat-${l})` }} />
          ))}
          {t("heatMore")}
          <span className="ml-2 h-[5px] w-[5px] rounded-full bg-good" />
          {t("income")}
        </div>
      </Card>

      {selected && (
        <section className="relative -mx-4 mt-4 rounded-t-[26px] bg-surface px-4 pb-4 pt-2.5 shadow-[0_-4px_18px_rgba(16,40,80,0.08)] md:mx-0 md:rounded-[22px]">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" aria-hidden />
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold">{dayLabel(selected, lang)}</h2>
            {dayTxs.length > 0 && (
              <NetAmount className="text-[15px] font-bold" income={sumBy(dayTxs, "income")} expense={sumBy(dayTxs, "expense")} />
            )}
          </div>
          {!txs.data ? (
            txs.error ? (
              <ErrorNote detail={txs.error} className="py-4 text-center" />
            ) : (
              <p className="py-4 text-center text-sm text-muted">{t("loading")}</p>
            )
          ) : dayTxs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{t("noEntriesDay")}</p>
          ) : (
            <>
              {points.length > 0 && (
                <div className="mb-2">
                  <Map points={points} line height={240} />
                </div>
              )}
              {dayTxs.map((tx) => (
                <TxRow key={tx.id} tx={tx} index={pinNumber.get(tx.id)} />
              ))}
            </>
          )}
          <Link
            href={`/add?date=${selected}`}
            className="mt-2 flex items-center justify-center rounded-2xl border border-dashed border-baseline py-2.5 text-sm font-semibold text-accent-ink"
          >
            + {t("addForDay")}
          </Link>
        </section>
      )}
    </>
  );
}
