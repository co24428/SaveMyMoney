// Single-password auth. The session cookie is `${expiry}.${HMAC(password, expiry)}`,
// so changing APP_PASSWORD signs every device out.
export const SESSION_COOKIE = "smm_session";
export const SESSION_DAYS = 90;

async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordConfigured(): boolean {
  return !!process.env.APP_PASSWORD;
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = process.env.APP_PASSWORD;
  if (!pw || typeof input !== "string") return false;
  // Compare fixed-length digests so timing does not leak the password length.
  const [a, b] = await Promise.all([hmac("smm-compare", input), hmac("smm-compare", pw)]);
  return safeEqual(a, b);
}

export async function makeToken(): Promise<string> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) throw new Error("APP_PASSWORD is not set");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  return `${exp}.${await hmac(pw, `smm-session:${exp}`)}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  const pw = process.env.APP_PASSWORD;
  if (!pw || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(token.slice(dot + 1), await hmac(pw, `smm-session:${exp}`));
}
