import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { RECEIPT_PATH_RE, loadReceipt } from "@/lib/storage";

type Ctx = { params: Promise<{ path: string[] }> };
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const key = (await ctx.params).path.join("/");
  if (!RECEIPT_PATH_RE.test(key)) throw new HttpError(400, "Invalid path");
  const found = await loadReceipt(key);
  if (!found) throw new HttpError(404, "Not found");
  if ("url" in found) return NextResponse.redirect(found.url);
  return new Response(new Uint8Array(found.data), {
    headers: { "Content-Type": TYPES[key.split(".").pop()!], "Cache-Control": "private, max-age=3600" },
  });
});
