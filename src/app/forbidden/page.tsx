import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export const metadata: Metadata = { title: "403 Forbidden · Access Denied" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-xs">
          <ShieldAlert size={32} />
        </div>

        <span className="mt-6 inline-block rounded-full bg-rose-100 px-3 py-1 font-mono text-xs font-bold text-rose-700">
          403 — ACCESS DENIED
        </span>

        <h1 className="mt-3 font-sans text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Restricted Area
        </h1>

        <p className="mt-2 text-xs text-gray-600 leading-relaxed">
          You are signed in, but your current account role does not have permission to access this portal or resource.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
          >
            <Home size={14} />
            <span>Return to Store</span>
          </Link>
          <Link
            href="/account"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Go to My Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
