import { NextResponse } from "next/server";
import { DATE_RE, route } from "@/lib/api";
import { listTx, parseTx, saveTx } from "@/lib/tx";

export const GET = route(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const date = (k: string) => (DATE_RE.test(q.get(k) ?? "") ? q.get(k)! : undefined);
  const num = (k: string) => {
    const n = Number(q.get(k));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const rows = await listTx({
    from: date("from"),
    to: date("to"),
    kind: q.get("kind") ?? undefined,
    category: num("category"),
    person: num("person"),
    event: num("event"),
    q: q.get("q")?.trim().slice(0, 100) || undefined,
    limit: num("limit"),
  });
  return NextResponse.json(rows);
});

export const POST = route(async (req: Request) => {
  const input = parseTx(await req.json().catch(() => null));
  const id = await saveTx(input);
  return NextResponse.json({ id });
});
