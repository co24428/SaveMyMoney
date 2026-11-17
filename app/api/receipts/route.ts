import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { bad, route } from "@/lib/api";
import { saveReceipt } from "@/lib/storage";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

export const POST = route(async (req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) bad("No file");
  const ext = EXT[file.type];
  if (!ext) bad("Unsupported image type");
  if (file.size > MAX_BYTES) bad("Image is too large");
  const key = `${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`;
  await saveReceipt(key, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ path: key });
});
