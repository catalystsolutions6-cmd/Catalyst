"use client";
import { useActionState } from "react";
import { login } from "../actions";
import { Logo } from "@/components/Logo";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center justify-between"><Logo href="/admin" /><span className="text-xs font-semibold uppercase text-slate-400">Admin</span></div>
        <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
        <div><label className="label">Password</label><input name="password" type="password" required className="input" /></div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
