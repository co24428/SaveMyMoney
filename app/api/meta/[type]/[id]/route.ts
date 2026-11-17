import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, route, toId } from "@/lib/api";
import { isUniqueViolation, metaIcon, metaName, metaType } from "@/lib/meta";

type Ctx = { params: Promise<{ type: string; id: string }> };

export const PUT = route(async (req: Request, ctx: Ctx) => {
  const p = await ctx.params;
  const type = metaType(p.type);
  const id = toId(p.id);
  const body = await req.json().catch(() => ({}));
  const name = metaName(body);
  const sql = await db();
  try {
    const rows =
      type === "categories"
        ? await sql`update categories set name = ${name}, icon = ${metaIcon(body)} where id = ${id} returning id, kind, name, icon`
        : type === "people"
          ? await sql`update people set name = ${name} where id = ${id} returning id, name`
          : await sql`update events set name = ${name} where id = ${id} returning id, name`;
    if (!rows.length) throw new HttpError(404, "Not found");
    return NextResponse.json(rows[0]);
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "exists");
    throw e;
  }
});

// Deleting keeps the transactions; they just lose the link.
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const p = await ctx.params;
  const type = metaType(p.type);
  const id = toId(p.id);
  const sql = await db();
  if (type === "categories") await sql`delete from categories where id = ${id}`;
  else if (type === "people") await sql`delete from people where id = ${id}`;
  else await sql`delete from events where id = ${id}`;
  return NextResponse.json({ ok: true });
});
