"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { method: "POST", body: { password } });
      window.location.href = "/";
    } catch (err) {
      const code = err instanceof ApiError ? err.message : "";
      setError(
        code === "wrong"
          ? t("wrongPassword")
          : code === "too_many"
            ? t("tooManyAttempts")
            : code === "not_configured"
              ? t("notConfigured")
              : `${t("error")} ${err instanceof Error ? err.message : ""}`,
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <div className="text-center">
          <div className="hero mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl font-bold shadow-[0_8px_20px_rgba(42,120,214,0.35)]">
            ₩
          </div>
          <h1 className="text-xl font-semibold">{t("appName")}</h1>
        </div>
        <input
          type="password"
          className="field"
          placeholder={t("password")}
          aria-label={t("password")}
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
        <button
          disabled={busy || !password}
          className="hero w-full rounded-2xl py-3 font-bold disabled:opacity-50"
        >
          {t("login")}
        </button>
      </form>
    </main>
  );
}
