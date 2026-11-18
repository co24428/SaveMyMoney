import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import { ToastProvider } from "@/components/motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>
        <Suspense>{children}</Suspense>
      </AppShell>
    </ToastProvider>
  );
}
