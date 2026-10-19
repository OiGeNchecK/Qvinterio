import { getDictionary } from "@/i18n";
import { LoginDialog } from "./login-dialog";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale, t } = getDictionary((await params).locale);
  return <LoginDialog locale={locale} t={t} />;
}
