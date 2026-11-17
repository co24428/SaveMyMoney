import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, route, toId } from "@/lib/api";
import { deleteReceipt } from "@/lib/storage";
import { listTx, parseTx, saveTx } from "@/lib/tx";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const [row] = await listTx({ id: toId((await ctx.params).id) });
  if (!row) throw new HttpError(404, "Not found");
  return NextResponse.json(row);
});

export const PUT = route(async (req: Request, ctx: Ctx) => {
  const id = toId((await ctx.params).id);
  const input = parseTx(await req.json().catch(() => null));
  const sql = await db();
  const [before] = await sql`select receipt_path from transactions where id = ${id}`;
  if (!before || !(await saveTx(input, id))) throw new HttpError(404, "Not found");
  if (before.receipt_path && before.receipt_path !== input.receipt_path) {
    await deleteReceipt(before.receipt_path);
  }
  return NextResponse.json({ id });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const id = toId((await ctx.params).id);
  const sql = await db();
  const [row] = await sql`delete from transactions where id = ${id} returning receipt_path`;
  if (row?.receipt_path) await deleteReceipt(row.receipt_path);
  return NextResponse.json({ ok: true });
});
