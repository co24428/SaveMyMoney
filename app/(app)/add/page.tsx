"use client";

import { useSearchParams } from "next/navigation";
import TxForm from "@/components/TxForm";
import { PageTitle } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function AddPage() {
  const { t } = useI18n();
  const date = useSearchParams().get("date");
  return (
    <>
      <PageTitle>{t("addEntry")}</PageTitle>
      <TxForm defaultDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined} />
    </>
  );
}
