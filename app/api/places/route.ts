import { NextResponse } from "next/server";
import { route } from "@/lib/api";

type Place = { name: string; address: string; lat: number; lng: number };

const strip = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

async function naver(q: string): Promise<Place[] | null> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?display=5&query=${encodeURIComponent(q)}`,
    { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret }, cache: "no-store" },
  );
  if (!res.ok) {
    console.error("Naver search failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as {
    items?: { title: string; address: string; roadAddress: string; mapx: string; mapy: string }[];
  };
  return (data.items ?? [])
    .map((it) => ({
      name: strip(it.title),
      address: it.roadAddress || it.address || "",
      // Naver returns WGS84 coordinates multiplied by 10^7.
      lng: Number(it.mapx) / 1e7,
      lat: Number(it.mapy) / 1e7,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90);
}

async function osm(q: string, lang: string): Promise<Place[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`,
    {
      headers: { "User-Agent": "personal-ledger-app/1.0", "Accept-Language": lang === "ko" ? "ko,en" : "en,ko" },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { name?: string; display_name: string; lat: string; lon: string }[];
  return data.map((d) => {
    const name = d.name || d.display_name.split(",")[0];
    const rest = d.display_name.startsWith(name) ? d.display_name.slice(name.length).replace(/^,\s*/, "") : d.display_name;
    return { name, address: rest, lat: Number(d.lat), lng: Number(d.lon) };
  });
}

export const GET = route(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ source: "none", results: [] });
  const fromNaver = await naver(q).catch((e) => {
    console.error(e);
    return null;
  });
  if (fromNaver?.length) return NextResponse.json({ source: "naver", results: fromNaver });
  return NextResponse.json({ source: "osm", results: await osm(q, params.get("lang") ?? "en") });
});
