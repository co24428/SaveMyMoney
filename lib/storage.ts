import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "receipts";
const LOCAL_DIR = path.join(process.cwd(), ".data", "receipts");
export const RECEIPT_PATH_RE = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

let cached: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached ??= createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

function requireLocalAllowed() {
  if (process.env.VERCEL) {
    throw new Error("Receipt storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
}

export async function saveReceipt(key: string, data: Buffer, contentType: string) {
  const sb = supabase();
  if (!sb) {
    requireLocalAllowed();
    const file = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return;
  }
  const upload = () => sb.storage.from(BUCKET).upload(key, data, { contentType });
  let { error } = await upload();
  if (error && /bucket not found/i.test(error.message)) {
    // First upload ever: create the private bucket, then retry.
    const created = await sb.storage.createBucket(BUCKET, { public: false });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
    ({ error } = await upload());
  }
  if (error) throw error;
}

/** Returns either a short-lived signed URL (Supabase) or the raw bytes (local dev). */
export async function loadReceipt(key: string): Promise<{ url: string } | { data: Buffer } | null> {
  const sb = supabase();
  if (!sb) {
    requireLocalAllowed();
    try {
      return { data: await readFile(path.join(LOCAL_DIR, key)) };
    } catch {
      return null;
    }
  }
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(key, 600);
  if (error || !data) return null;
  return { url: data.signedUrl };
}

export async function deleteReceipt(key: string | null | undefined) {
  if (!key || !RECEIPT_PATH_RE.test(key)) return;
  try {
    const sb = supabase();
    if (!sb) await rm(path.join(LOCAL_DIR, key), { force: true });
    else await sb.storage.from(BUCKET).remove([key]);
  } catch (e) {
    console.error("Failed to delete receipt", key, e);
  }
}

/** Used by the diagnostics check. */
export async function checkStorage(): Promise<string> {
  const sb = supabase();
  if (!sb) {
    requireLocalAllowed();
    return "local folder (development only)";
  }
  const { data, error } = await sb.storage.listBuckets();
  if (error) throw error;
  return data.some((b) => b.name === BUCKET)
    ? `bucket "${BUCKET}" found`
    : `connected; bucket "${BUCKET}" will be created on first upload`;
}
