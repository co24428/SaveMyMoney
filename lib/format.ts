import type { Lang } from "./i18n";

export const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

/** Short amount for tight spaces: 12.3만 / 1.2억 in Korean, 123K / 1.2M in English. */
export function compactWon(n: number, lang: Lang): string {
  if (lang === "ko") {
    const trim = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, ""));
    if (n >= 1e8) return `${trim(n / 1e8)}억`;
    if (n >= 1e4) return `${trim(n / 1e4)}만`;
    return Math.round(n).toLocaleString("ko-KR");
  }
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayYmd = () => ymd(new Date());
export const nowHm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const thisMonth = () => todayYmd().slice(0, 7);

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};

export function addMonths(month: string, n: number): string {
  const d = parse(month);
  d.setMonth(d.getMonth() + n);
  return ymd(d).slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string; days: number } {
  const d = parse(month);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(days)}`, days };
}

export const monthLabel = (month: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang, { year: "numeric", month: "long" }).format(parse(month));
export const monthShort = (month: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang, { month: "short" }).format(parse(month));
export const dayLabel = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang, { month: "long", day: "numeric", weekday: "short" }).format(parse(date));
export const weekdayNames = (lang: Lang) =>
  Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: "short" }).format(new Date(2023, 0, 1 + i)),
  );
export const weekdayOf = (date: string) => parse(date).getDay();
