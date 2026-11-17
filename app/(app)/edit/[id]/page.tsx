"use client";

import { useParams } from "next/navigation";
import TxForm from "@/components/TxForm";
import { PageTitle } from "@/components/ui";
import { useFetch, type Tx } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

export default function EditPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const tx = useFetch<Tx>(`/api/transactions/${id}`);
  return (
    <>
      <PageTitle>{t("editEntry")}</PageTitle>
      {tx.error ? (
        <p className="text-sm text-critical">{t("error")}</p>
      ) : tx.data && !tx.loading ? (
        <TxForm key={tx.data.id} initial={tx.data} />
      ) : (
        <p className="text-sm text-muted">{t("loading")}</p>
      )}
    </>
  );
}
