import { getDictionary } from "@/i18n";
import { WorkerHome } from "./worker-home";

export default async function WorkerPage({ params }: PageProps<"/[locale]/worker">) {
  const { t } = getDictionary((await params).locale);
  return <WorkerHome t={t} />;
}
