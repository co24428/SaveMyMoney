"use client";

import Link from "next/link";
import { DailyChart, PaceChart, TrendChart } from "@/components/Charts";
import { Card, CategoryTile, ErrorNote, MonthNav, PageTitle, RankBars, TxRow } from "@/components/ui";
import { CountUp, ListSkeleton, Skeleton } from "@/components/motion";
import { useFetch, type Tx } from "@/lib/client";
import { addMonths, monthRange, thisMonth, todayYmd, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

type Ranked = { id?: number | null; name: string | null; icon?: string | null; total: number; count: number };
type Stats = {
  month: string;
  trend: { month: string; income: number; expense: number }[];
  daily: { date: string; expense: number; income: number }[];
  prevDaily: { date: string; expense: number }[];
  byCategory: (Ranked & { kind: "expense" | "income" })[];
  places: Ranked[];
  people: Ranked[];
  events: Ranked[];
};

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const query = useQuery();
  const month = validMonth(query.get("m"), thisMonth());
  const range = monthRange(month);
  const stats = useFetch<Stats>(`/api/stats?month=${month}`);
  const recent = useFetch<Tx[]>(`/api/transactions?from=${range.from}&to=${range.to}&limit=5`);

  const s = stats.data?.month === month ? stats.data : null;
  const cur = s?.trend.at(-1);
  const prev = s?.trend.at(-2);
  const delta = cur && prev && prev.expense > 0 ? ((cur.expense - prev.expense) / prev.expense) * 100 : null;
  const net = cur ? cur.income - cur.expense : 0;

  // Pace: average per elapsed day, and days remaining for the current month.
  const today = todayYmd();
  const isCurrent = month === today.slice(0, 7);
  const isFuture = month > today.slice(0, 7);
  const elapsed = isCurrent ? Number(today.slice(8)) : isFuture ? 0 : range.days;
  const perDay = cur && elapsed ? cur.expense / elapsed : 0;
  const monthName = (m: string) => new Intl.DateTimeFormat(lang, { month: "long" }).format(new Date(`${m}-01T00:00:00`));

  const rank = (rows: Ranked[], tiles = false) =>
    rows.map((r, i) => ({
      key: r.id ?? r.name ?? `none-${i}`,
      label: tiles ? (r.name ?? t("uncategorized")) : `${r.icon ? `${r.icon} ` : ""}${r.name ?? t("uncategorized")}`,
      total: r.total,
      hint: t("times", { n: r.count }),
      tile: tiles ? <CategoryTile icon={r.icon ?? null} id={r.id ?? null} size="sm" /> : undefined,
    }));

  return (
    <>
      <PageTitle right={<MonthNav month={month} onChange={(m) => query.set({ m })} />}>{t("dashboard")}</PageTitle>

      {stats.error ? (
        <ErrorNote detail={stats.error} className="py-10 text-center" />
      ) : !s || !cur ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-[212px] !rounded-[22px] md:col-span-2" />
          <Skeleton className="h-56 !rounded-[20px]" />
          <Skeleton className="h-56 !rounded-[20px]" />
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2">
          <section className="hero relative overflow-hidden rounded-[22px] p-5 shadow-[0_8px_24px_rgba(28,92,171,0.25)] md:col-span-2">
            <span className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" aria-hidden />
            <span className="pointer-events-none absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/[0.07]" aria-hidden />
            <div className="text-[13px] opacity-85">{t("spentThisMonth")}</div>
            <div className="relative mt-0.5 text-[34px] font-bold leading-tight tracking-tight tabular-nums">
              <CountUp value={cur.expense} format={won} />
            </div>
            {delta !== null && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% {t("vsMonth", { m: monthName(addMonths(month, -1)) })}
              </span>
            )}
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/15 px-3 py-2.5 transition-colors hover:bg-white/20">
                <div className="text-xs opacity-85">{t("income")}</div>
                <div className="mt-0.5 text-[17px] font-bold tabular-nums">
                  <CountUp value={cur.income} format={won} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2.5 transition-colors hover:bg-white/20">
                <div className="text-xs opacity-85">{net < 0 ? t("overspent") : t("leftOver")}</div>
                <div className="mt-0.5 text-[17px] font-bold tabular-nums">
                  {net < 0 ? "−" : ""}
                  <CountUp value={Math.abs(net)} format={won} />
                </div>
              </div>
            </div>
            {perDay > 0 && (
              <div className="relative mt-3 text-xs opacity-90">
                {isCurrent
                  ? t("perDayLeft", { a: won(perDay), n: range.days - elapsed })
                  : t("perDayAvg", { a: won(perDay) })}
              </div>
            )}
          </section>

          <Card title={t("spendingPace")}>
            <PaceChart
              current={s.daily}
              previous={s.prevDaily}
              currentLabel={monthName(month)}
              previousLabel={monthName(addMonths(month, -1))}
              upToDay={elapsed}
            />
          </Card>
          <Card
            title={t("byCategory")}
            action={
              <Link href={`/transactions?m=${month}&kind=expense`} className="press rounded-full px-2 py-0.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-soft">
                {t("seeAll")}
              </Link>
            }
          >
            <RankBars rows={rank(s.byCategory.filter((c) => c.kind === "expense"), true)} empty={t("noData")} />
          </Card>
          <Card title={t("dailySpend")}>
            <DailyChart data={s.daily} />
          </Card>
          <Card title={t("incomeByCategory")}>
            <RankBars rows={rank(s.byCategory.filter((c) => c.kind === "income"), true)} empty={t("noData")} />
          </Card>
          <Card title={t("monthlyTrend")} className="md:col-span-2">
            <TrendChart data={s.trend} />
          </Card>
          <Card title={t("topPlaces")}>
            <RankBars rows={rank(s.places)} empty={t("noData")} />
          </Card>
          <Card title={t("topPeople")}>
            <RankBars rows={rank(s.people)} empty={t("noData")} />
          </Card>
          <Card title={t("events")} className="md:col-span-2">
            <RankBars rows={rank(s.events)} empty={t("noData")} />
          </Card>
          <Card
            title={t("recent")}
            className="md:col-span-2"
            action={
              <Link href={`/transactions?m=${month}`} className="press rounded-full px-2 py-0.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-soft">
                {t("seeAll")}
              </Link>
            }
          >
            {recent.data?.length ? (
              <div className="stagger">
                {recent.data.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </div>
            ) : recent.data ? (
              <p className="text-sm text-muted">{t("noEntries")}</p>
            ) : (
              <ListSkeleton rows={3} />
            )}
          </Card>
        </div>
      )}
    </>
  );
}
