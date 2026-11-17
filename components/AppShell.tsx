"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Key } from "@/lib/i18n";

const ICONS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  history: "M4 6h16M4 12h16M4 18h10",
  calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z",
};

const TABS: { href: string; key: Key }[] = [
  { href: "/", key: "dashboard" },
  { href: "/transactions", key: "history" },
  { href: "/add", key: "add" },
  { href: "/calendar", key: "calendar" },
  { href: "/map", key: "mapLogs" },
  { href: "/settings", key: "settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl">
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0"
      >
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          {TABS.map((tab) => {
            const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
            if (tab.key === "add") {
              return (
                <li key={tab.href} className="flex items-center">
                  <Link
                    href="/add"
                    aria-label={t("addEntry")}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white shadow"
                  >
                    +
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 whitespace-nowrap py-2 text-[10.5px] md:flex-row md:justify-center md:gap-2 md:py-3.5 md:text-sm ${
                    active ? "font-semibold text-accent-ink" : "text-ink2"
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONS[tab.key === "mapLogs" ? "map" : tab.key]} />
                  </svg>
                  {t(tab.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="px-4 pb-24 pt-5 md:pb-10">{children}</main>
    </div>
  );
}
