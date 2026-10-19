"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
import { Button } from "@/components/button";

type Labels = {
  email: string;
  password: string;
  submit: string;
  error: string;
  notConfigured: string;
};

const input =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-white outline-none transition focus:border-olive";

export function LoginForm({ labels, next }: { labels: Labels; next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block space-y-1.5">
        <span className="text-sm text-silver-dim">{labels.email}</span>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-silver-dim">{labels.password}</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state.error && (
        <p className="text-sm text-red-400">
          {state.error === "notConfigured" ? labels.notConfigured : labels.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {labels.submit}
      </Button>
    </form>
  );
}
