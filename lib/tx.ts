import { db } from "./db";
import { DATE_RE, bad } from "./api";
import { RECEIPT_PATH_RE } from "./storage";

export const METHODS = ["card", "cash", "transfer"] as const;

export type TxInput = {
  kind: "expense" | "income";
  amount: number;
  date: string;
  time: string | null;
  category_id: number | null;
  event_id: number | null;
  method: string | null;
  note: string;
  place_name: string | null;
  place_address: string | null;
  lat: number | null;
  lng: number | null;
  receipt_path: string | null;
  people: number[];
};

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
};
const idOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) bad("Invalid id");
  return n;
};

export function parseTx(body: unknown): TxInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind = b.kind === "income" ? "income" : b.kind === "expense" ? "expense" : bad("Invalid kind");
  const amount = Number(b.amount);
  if (!Number.isInteger(amount) || amount < 0 || amount > 2_000_000_000) bad("Invalid amount");
  const date = typeof b.date === "string" && DATE_RE.test(b.date) ? b.date : bad("Invalid date");
  const time = typeof b.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time) ? b.time : null;
  const lat = typeof b.lat === "number" && Math.abs(b.lat) <= 90 ? b.lat : null;
  const lng = typeof b.lng === "number" && Math.abs(b.lng) <= 180 ? b.lng : null;
  const hasCoords = lat !== null && lng !== null;
  const receipt = str(b.receipt_path, 100);
  if (receipt && !RECEIPT_PATH_RE.test(receipt)) bad("Invalid receipt");
  const method = str(b.method, 20);
  return {
    kind,
    amount,
    date,
    time,
    category_id: idOrNull(b.category_id),
    event_id: idOrNull(b.event_id),
    method: kind === "expense" && method && (METHODS as readonly string[]).includes(method) ? method : null,
    note: str(b.note, 500) ?? "",
    place_name: str(b.place_name, 200),
    place_address: str(b.place_address, 300),
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    receipt_path: receipt,
    people: Array.isArray(b.people) ? [...new Set(b.people.map((p) => idOrNull(p)!).filter(Boolean))] : [],
  };
}

export type TxFilter = {
  id?: number;
  from?: string;
  to?: string;
  kind?: string;
  category?: number;
  person?: number;
  event?: number;
  q?: string;
  limit?: number;
};

export async function listTx(f: TxFilter) {
  const sql = await db();
  const like = f.q ? `%${f.q.replace(/[\\%_]/g, "\\$&")}%` : null;
  return sql`
    select t.id, t.kind, t.amount, t.date::text as date, t.time, t.category_id,
           c.name as category_name, c.icon as category_icon,
           t.event_id, e.name as event_name, t.method, t.note,
           t.place_name, t.place_address, t.lat, t.lng, t.receipt_path,
           coalesce((
             select json_agg(json_build_object('id', p.id, 'name', p.name) order by p.name)
             from transaction_people tp join people p on p.id = tp.person_id
             where tp.transaction_id = t.id
           ), '[]'::json) as people
    from transactions t
    left join categories c on c.id = t.category_id
    left join events e on e.id = t.event_id
    where true
      ${f.id ? sql`and t.id = ${f.id}` : sql``}
      ${f.from ? sql`and t.date >= ${f.from}` : sql``}
      ${f.to ? sql`and t.date <= ${f.to}` : sql``}
      ${f.kind === "expense" || f.kind === "income" ? sql`and t.kind = ${f.kind}` : sql``}
      ${f.category ? sql`and t.category_id = ${f.category}` : sql``}
      ${f.event ? sql`and t.event_id = ${f.event}` : sql``}
      ${f.person ? sql`and exists (select 1 from transaction_people tp where tp.transaction_id = t.id and tp.person_id = ${f.person})` : sql``}
      ${like ? sql`and (t.note ilike ${like} or t.place_name ilike ${like} or c.name ilike ${like} or e.name ilike ${like})` : sql``}
    order by t.date desc, t.time desc nulls last, t.created_at desc
    limit ${Math.min(f.limit ?? 3000, 3000)}
  `;
}

export async function saveTx(input: TxInput, id?: number): Promise<number | null> {
  const sql = await db();
  const { people, ...row } = input;
  return sql.begin(async (tx) => {
    let txId: number;
    if (id) {
      const updated = await tx`update transactions set ${tx(row)} where id = ${id} returning id`;
      if (!updated.length) return null;
      txId = id;
      await tx`delete from transaction_people where transaction_id = ${id}`;
    } else {
      const [created] = await tx`insert into transactions ${tx(row)} returning id`;
      txId = created.id;
    }
    if (people.length) {
      await tx`
        insert into transaction_people (transaction_id, person_id)
        select ${txId}, id from people where id in ${tx(people)}
      `;
    }
    return txId;
  });
}
