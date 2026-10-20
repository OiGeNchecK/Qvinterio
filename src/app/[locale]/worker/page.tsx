import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import { WorkerHome } from "./worker-home";

export default async function WorkerPage({ params }: PageProps<"/[locale]/worker">) {
  const { locale, t } = getDictionary((await params).locale);
  return (
    <Suspense>
      <WorkerHome locale={locale} t={t} />
    </Suspense>
  );
}
