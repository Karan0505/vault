"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail, User as UserIcon, Check, AlertCircle, ArrowRight } from "lucide-react";
import { validatePassword } from "@/lib/auth/password";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] || "Please enter a secure password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      let data: { error?: string; success?: boolean } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g., 502/504 proxy error or crash page)
      }

      if (!res.ok) {
        setError(data?.error || `Registration failed (${res.status}). Please try again.`);
        setLoading(false);
        return;
      }

      // Automatically sign in after successful registration
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInRes?.error) {
        // If auto-login fails, send to login page
        router.push("/login?registered=true");
      } else {
        router.push("/account");
        router.refresh();
      }
    } catch {
      setError("Network error. Please check your connection.");
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
              Create an account
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Join VAULT for order tracking, wishlist, and fast checkout.
            </p>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Full name
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <UserIcon
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

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
              <label className="block text-xs font-semibold text-gray-700">
                Password
              </label>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Confirm password
              </label>
              <div className="relative mt-1.5">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-xs text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Password strength checklist */}
            {password.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 text-[11px] text-gray-600">
                <p className="font-semibold text-gray-700 mb-1.5">Password requirements:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-600 font-medium" : "text-gray-500"}`}>
                    <Check size={12} className={password.length >= 8 ? "text-emerald-600" : "text-gray-300"} />
                    <span>At least 8 characters</span>
                  </li>
                  <li className={`flex items-center gap-1.5 ${/\d/.test(password) ? "text-emerald-600 font-medium" : "text-gray-500"}`}>
                    <Check size={12} className={/\d/.test(password) ? "text-emerald-600" : "text-gray-300"} />
                    <span>At least one number (0-9)</span>
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-emerald-600 font-medium" : "text-gray-500"}`}>
                    <Check size={12} className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-emerald-600" : "text-gray-300"} />
                    <span>At least one special character (@, #, $, etc.)</span>
                  </li>
                  {confirmPassword.length > 0 && (
                    <li className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}`}>
                      <Check size={12} className={passwordsMatch ? "text-emerald-600" : "text-rose-400"} />
                      <span>Passwords match</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || !passwordsMatch}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-black py-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>{loading ? "Creating account..." : "Create account"}</span>
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
            <span>Already have an account? </span>
            <Link href="/login" className="font-semibold text-black hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
