import { signIn } from "@/lib/auth";

export default function AdminSignInPage() {
  async function signInAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    if (typeof email !== "string" || !email) return;
    await signIn("staff", { email, redirectTo: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-900/60 p-8 shadow-vault">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brass-400/50 text-[13px] font-display italic text-brass-300">
            V
          </span>
          <span className="font-display text-lg text-ink-50">VAULT ops console</span>
        </div>
        <p className="mb-6 text-sm text-ink-400">
          Sign in with a staff account to manage the catalogue.
        </p>
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
          <button
            type="submit"
            className="mt-2 rounded-full bg-brass-400 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-xs text-ink-600">
          Credentials sign-in is scaffolding for staff access in Phase 1 — customer accounts
          and OAuth land with checkout in Phase 2.
        </p>
      </div>
    </div>
  );
}
