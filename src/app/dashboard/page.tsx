import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/auth-actions";

// Sends each user to their area based on role.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const home = homePathFor(user);
  if (home) redirect(home);

  const { t } = await getDictionary();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo size={56} />
      <p className="max-w-md text-silver-dim">{t.common.noRole}</p>
      <form action={signOut}>
        <button className="text-sm text-olive-light hover:underline">{t.nav.logout}</button>
      </form>
    </div>
  );
}
