import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getDictionary } from "@/i18n";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ t }, { next }] = await Promise.all([getDictionary(), searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="gold-arc -left-1/2 top-1/3 h-[60rem] w-[200%] -rotate-6" />
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      <div className="relative w-full max-w-sm rounded-3xl border border-line bg-panel/90 p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo size={56} />
          <div>
            <h1 className="font-display text-2xl text-white">{t.login.title}</h1>
            <p className="mt-1 text-sm text-silver-dim">{t.login.subtitle}</p>
          </div>
        </div>
        <LoginForm labels={t.login} next={typeof next === "string" ? next : undefined} />
      </div>
    </div>
  );
}
