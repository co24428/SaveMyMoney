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
              : t("error"),
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-white">
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
          className="w-full rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {t("login")}
        </button>
      </form>
    </main>
  );
}
