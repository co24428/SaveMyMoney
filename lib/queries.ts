import { db } from "./db";

/** Categories, people and events in a single query. */
export async function loadMeta() {
  const sql = await db();
  const [row] = await sql`
    select
      coalesce((select json_agg(json_build_object('id', id, 'kind', kind, 'name', name, 'icon', icon)
                               order by kind, sort, id) from categories), '[]'::json) as categories,
      coalesce((select json_agg(json_build_object('id', id, 'name', name) order by name)
                from people), '[]'::json) as people,
      coalesce((select json_agg(json_build_object('id', id, 'name', name) order by created_at desc, id desc)
                from events), '[]'::json) as events
  `;
  return { categories: row.categories, people: row.people, events: row.events };
}

/** Everything the dashboard needs for one month (YYYY-MM). Queries run one at a time. */
export async function loadStats(month: string) {
  const start = `${month}-01`;
  const sql = await db();
  const inMonth = sql`t.date >= ${start}::date and t.date < (${start}::date + interval '1 month')`;

  const trend = await sql`
    select to_char(m, 'YYYY-MM') as month,
           coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::float8 as income,
           coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::float8 as expense
    from generate_series(${start}::date - interval '11 months', ${start}::date, interval '1 month') m
    left join transactions t on t.date >= m and t.date < m + interval '1 month'
    group by m order by m
  `;
  const daily = await sql`
    select d::date::text as date,
           coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::float8 as expense,
           coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::float8 as income
    from generate_series(${start}::date, ${start}::date + interval '1 month' - interval '1 day', interval '1 day') d
    left join transactions t on t.date = d::date
    group by d order by d
  `;
  // Previous month, for the spending-pace comparison.
  const prevDaily = await sql`
    select d::date::text as date,
           coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::float8 as expense
    from generate_series(${start}::date - interval '1 month', ${start}::date - interval '1 day', interval '1 day') d
    left join transactions t on t.date = d::date
    group by d order by d
  `;
  const byCategory = await sql`
    select t.kind, t.category_id as id, c.name, c.icon,
           sum(t.amount)::float8 as total, count(*)::int as count
    from transactions t left join categories c on c.id = t.category_id
    where ${inMonth}
    group by t.kind, t.category_id, c.name, c.icon
    order by total desc
  `;
  const places = await sql`
    select t.place_name as name, sum(t.amount)::float8 as total, count(*)::int as count
    from transactions t
    where ${inMonth} and t.kind = 'expense' and t.place_name is not null
    group by t.place_name order by total desc limit 5
  `;
  const people = await sql`
    select p.id, p.name, sum(t.amount)::float8 as total, count(*)::int as count
    from transactions t
    join transaction_people tp on tp.transaction_id = t.id
    join people p on p.id = tp.person_id
    where ${inMonth} and t.kind = 'expense'
    group by p.id, p.name order by total desc limit 5
  `;
  const events = await sql`
    select e.id, e.name, sum(t.amount)::float8 as total, count(*)::int as count
    from transactions t join events e on e.id = t.event_id
    where ${inMonth} and t.kind = 'expense'
    group by e.id, e.name order by total desc limit 5
  `;
  return { month, trend, daily, prevDaily, byCategory, places, people, events };
}
