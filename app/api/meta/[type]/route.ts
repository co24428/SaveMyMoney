import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, bad, route } from "@/lib/api";
import { isUniqueViolation, metaIcon, metaName, metaType } from "@/lib/meta";

type Ctx = { params: Promise<{ type: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const type = metaType((await ctx.params).type);
  const body = await req.json().catch(() => ({}));
  const name = metaName(body);
  const sql = await db();
  try {
    if (type === "categories") {
      const kind = body.kind === "income" ? "income" : body.kind === "expense" ? "expense" : bad("Invalid kind");
      const [row] = await sql`
        insert into categories (kind, name, icon, sort)
        values (${kind}, ${name}, ${metaIcon(body)},
                (select coalesce(max(sort), 0) + 1 from categories where kind = ${kind}))
        returning id, kind, name, icon
      `;
      return NextResponse.json(row);
    }
    const [row] =
      type === "people"
        ? await sql`insert into people (name) values (${name}) returning id, name`
        : await sql`insert into events (name) values (${name}) returning id, name`;
    return NextResponse.json(row);
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "exists");
    throw e;
  }
});
