"use client";

import Link from "next/link";
import { DailyChart, TrendChart } from "@/components/Charts";
import { Card, MonthNav, PageTitle, RankBars, TxRow } from "@/components/ui";
import { useFetch, type Tx } from "@/lib/client";
import { monthRange, thisMonth, won } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery, validMonth } from "@/lib/query";

type Ranked = { id?: number | null; name: string | null; icon?: string | null; total: number; count: number };
type Stats = {
  month: string;
  trend: { month: string; income: number; expense: number }[];
  daily: { date: string; expense: number; income: number }[];
  byCategory: (Ranked & { kind: "expense" | "income" })[];
  places: Ranked[];
  people: Ranked[];
  events: Ranked[];
};

function StatTile({ label, value, tone, children }: {
  label: string;
  value: string;
  tone?: "good" | "critical";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs text-ink2">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${tone === "good" ? "text-good" : tone === "critical" ? "text-critical" : ""}`}>
        {value}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
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
  const rank = (rows: Ranked[]) =>
    rows.map((r, i) => ({
      key: r.id ?? r.name ?? `none-${i}`,
      label: `${r.icon ? `${r.icon} ` : ""}${r.name ?? t("uncategorized")}`,
      total: r.total,
      hint: t("times", { n: r.count }),
    }));

  return (
    <>
      <PageTitle>{t("dashboard")}</PageTitle>
      <div className="mb-4">
        <MonthNav month={month} onChange={(m) => query.set({ m })} />
      </div>

      {stats.error ? (
        <p className="py-10 text-center text-sm text-critical">{t("error")}</p>
      ) : !s || !cur ? (
        <p className="py-10 text-center text-sm text-muted">{t("loading")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <StatTile label={t("expense")} value={won(cur.expense)}>
                {delta !== null && (
                  <div className="mt-1 text-xs text-ink2">
                    <span className={`font-semibold ${delta > 0 ? "text-critical" : "text-good"}`}>
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
                    </span>{" "}
                    {t("vsLastMonth")}
                  </div>
                )}
              </StatTile>
            </div>
            <StatTile label={t("income")} value={won(cur.income)} />
            <StatTile label={t("balance")} value={`${net < 0 ? "−" : ""}${won(Math.abs(net))}`} tone={net < 0 ? "critical" : "good"} />
          </div>

          <Card title={t("byCategory")}>
            <RankBars rows={rank(s.byCategory.filter((c) => c.kind === "expense"))} empty={t("noData")} />
          </Card>
          <Card title={t("dailySpend")}>
            <DailyChart data={s.daily} />
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
          <Card title={t("events")}>
            <RankBars rows={rank(s.events)} empty={t("noData")} />
          </Card>
          <Card title={t("incomeByCategory")}>
            <RankBars rows={rank(s.byCategory.filter((c) => c.kind === "income"))} empty={t("noData")} />
          </Card>
          <Card
            title={t("recent")}
            className="md:col-span-2"
            action={
              <Link href={`/transactions?m=${month}`} className="text-sm font-medium text-accent-ink">
                {t("seeAll")}
              </Link>
            }
          >
            {recent.data?.length ? (
              recent.data.map((tx) => <TxRow key={tx.id} tx={tx} />)
            ) : (
              <p className="text-sm text-muted">{recent.data ? t("noEntries") : t("loading")}</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
