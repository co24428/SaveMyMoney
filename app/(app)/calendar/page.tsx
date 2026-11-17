"use client";

import Link from "next/link";
import Map from "@/components/Map";
import { Card, ErrorNote, MonthNav, PageTitle, Totals, TxRow, sumBy } from "@/components/ui";
import { useFetch, type Tx } from "@/lib/client";
import { compactWon, dayLabel, monthRange, thisMonth, todayYmd, weekdayNames, weekdayOf } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

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
  const perDay: Record<string, { expense: number; income: number }> = {};
  for (const tx of rows) {
    perDay[tx.date] ??= { expense: 0, income: 0 };
    perDay[tx.date][tx.kind] += tx.amount;
  }

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
      return { lat: x.lat!, lng: x.lng!, title: x.place_name ?? "", label: String(i + 1) };
    });

  return (
    <>
      <PageTitle>{t("calendar")}</PageTitle>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <MonthNav month={month} onChange={(m) => query.set({ m, d: null })} />
        <Totals income={sumBy(rows, "income")} expense={sumBy(rows, "expense")} />
      </div>

      <Card className="!p-2">
        <div className="grid grid-cols-7 text-center text-xs text-muted">
          {weekdayNames(lang).map((w) => (
            <div key={w} className="py-1.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const sums = perDay[date];
            const isSelected = date === selected;
            return (
              <button
                key={date}
                onClick={() => query.set({ d: date })}
                aria-pressed={isSelected}
                aria-label={dayLabel(date, lang)}
                className={`flex min-h-[3.6rem] flex-col items-center rounded-lg px-0.5 py-1 text-xs ${
                  isSelected ? "bg-accent-soft ring-1 ring-accent" : "hover:bg-wash"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                    date === today ? "bg-accent font-semibold text-white" : ""
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {sums?.expense ? <span className="whitespace-nowrap text-[10px] tabular-nums leading-tight text-ink">−{compactWon(sums.expense, lang)}</span> : null}
                {sums?.income ? <span className="whitespace-nowrap text-[10px] tabular-nums leading-tight text-good">+{compactWon(sums.income, lang)}</span> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card
          className="mt-4"
          title={dayLabel(selected, lang)}
          action={
            <Link href={`/add?date=${selected}`} className="text-sm font-medium text-accent-ink">
              + {t("addForDay")}
            </Link>
          }
        >
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
              <div className="mb-3">
                <Totals income={sumBy(dayTxs, "income")} expense={sumBy(dayTxs, "expense")} />
              </div>
              {points.length > 0 && (
                <div className="mb-2">
                  <Map points={points} line height={260} />
                </div>
              )}
              {dayTxs.map((tx) => (
                <TxRow key={tx.id} tx={tx} index={pinNumber.get(tx.id)} />
              ))}
            </>
          )}
        </Card>
      )}
    </>
  );
}
