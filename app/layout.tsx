import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n";
import { LANG_COOKIE, type Lang } from "@/lib/lang";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveMyMoney",
  description: "Personal money log",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1017" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "ko" ? "ko" : "en";
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full font-sans">
        <I18nProvider initial={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
