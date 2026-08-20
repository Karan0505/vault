"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { getRoleRedirectUrl, type UserRole } from "@/lib/auth/roles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || undefined;
  const justRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });

      if (!res || res.error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch the authenticated user session to obtain trusted server-side role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role: UserRole = session?.user?.role || "CUSTOMER";

      // Resolve safe, role-validated redirect URL
      const destination = getRoleRedirectUrl(role, callbackUrl);
      router.push(destination as Parameters<typeof router.push>[0]);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xs sm:p-10">
          <div className="text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black font-serif text-base font-bold italic text-white shadow-xs">
              V
            </span>
            <h1 className="mt-4 font-sans text-2xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Sign in to your VAULT account or staff portal.
            </p>
          </div>

          {justRegistered && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>Account created successfully! Please sign in below.</span>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Email address
              </label>
              <div className="relative mt-1.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700">
                  Password
                </label>
              </div>
              <div className="relative mt-1.5">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-black py-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
            <span>Don&apos;t have an account? </span>
            <Link href="/register" className="font-semibold text-black hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="skeleton h-64 w-96 rounded-3xl" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
