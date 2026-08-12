import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { getOrCreateCart, mergeGuestCartIntoUser } from "@/lib/cart.server";

export default function CustomerSignInPage() {
  async function signInAction(formData: FormData) {
    "use server";
    const email = formData.get("email");
    if (typeof email !== "string" || !email) return;

    // Capture the guest cart's identity before signing in — once the
    // session changes, getOrCreateCart(userId) would resolve to a
    // (possibly new) user cart, and the guest cart's id would be lost.
    const guestCart = await getOrCreateCart(null);

    await signIn("customer", { email, redirect: false });

    const session = await auth();
    if (session?.user?.id) {
      await mergeGuestCartIntoUser(guestCart.id, session.user.id);
    }

    redirect("/cart");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink-50">Sign in</h1>
        <p className="mt-3 text-sm text-ink-500">
          Anything in your cart right now comes with you — it merges into your account instead
          of getting left behind.
        </p>
      </div>
      <form action={signInAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-300">Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-brass-400 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
