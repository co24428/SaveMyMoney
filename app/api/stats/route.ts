import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MONTH_RE, bad, route } from "@/lib/api";

// Everything the dashboard needs for one month, in one request.
export const GET = route(async (req: Request) => {
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) bad("Invalid month");
  const start = `${month}-01`;
  const sql = await db();
  const inMonth = sql`t.date >= ${start}::date and t.date < ${start}::date + interval '1 month'`;

  const [trend, daily, byCategory, places, people, events] = await Promise.all([
    sql`
      select to_char(m, 'YYYY-MM') as month,
             coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::float8 as income,
             coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::float8 as expense
      from generate_series(${start}::date - interval '11 months', ${start}::date, interval '1 month') m
      left join transactions t on t.date >= m and t.date < m + interval '1 month'
      group by m order by m
    `,
    sql`
      select d::date::text as date,
             coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::float8 as expense,
             coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::float8 as income
      from generate_series(${start}::date, ${start}::date + interval '1 month' - interval '1 day', interval '1 day') d
      left join transactions t on t.date = d::date
      group by d order by d
    `,
    sql`
      select t.kind, t.category_id as id, c.name, c.icon,
             sum(t.amount)::float8 as total, count(*)::int as count
      from transactions t left join categories c on c.id = t.category_id
      where ${inMonth}
      group by t.kind, t.category_id, c.name, c.icon
      order by total desc
    `,
    sql`
      select t.place_name as name, sum(t.amount)::float8 as total, count(*)::int as count
      from transactions t
      where ${inMonth} and t.kind = 'expense' and t.place_name is not null
      group by t.place_name order by total desc limit 5
    `,
    sql`
      select p.id, p.name, sum(t.amount)::float8 as total, count(*)::int as count
      from transactions t
      join transaction_people tp on tp.transaction_id = t.id
      join people p on p.id = tp.person_id
      where ${inMonth} and t.kind = 'expense'
      group by p.id, p.name order by total desc limit 5
    `,
    sql`
      select e.id, e.name, sum(t.amount)::float8 as total, count(*)::int as count
      from transactions t join events e on e.id = t.event_id
      where ${inMonth} and t.kind = 'expense'
      group by e.id, e.name order by total desc limit 5
    `,
  ]);
  return NextResponse.json({ month, trend, daily, byCategory, places, people, events });
});
