import Link from "next/link";
import { signIn } from "@/lib/auth";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = Boolean(params?.error);

  async function signInAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    if (typeof email !== "string" || !email || typeof password !== "string" || !password) return;
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900/70 p-8 shadow-vault">
        <Link href="/" className="mb-6 inline-flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brass-400/50 text-sm font-display italic text-brass-300 transition-colors group-hover:border-brass-300 group-hover:bg-brass-400/10">
            V
          </span>
          <span className="font-display text-xl text-ink-50 transition-colors group-hover:text-brass-300">
            VAULT ops console
          </span>
        </Link>
        <p className="mb-6 text-sm text-ink-400">
          Sign in with your staff email and password to access the operations console.
        </p>

        {hasError && (
          <div className="mb-4 rounded-lg border border-signal-red/30 bg-signal-red/10 px-3.5 py-2.5 text-xs text-signal-red">
            Invalid email or password. Please check your credentials.
          </div>
        )}

        <form action={signInAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-300">Staff email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@vault.internal"
              className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-300">Password</span>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-full bg-brass-400 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
