import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { StaffSignInForm } from "@/components/admin/StaffSignInForm";
import { AuthError } from "next-auth";

export default async function AdminSignInPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const hasError = Boolean(searchParams?.error);

  async function signInAction(formData: FormData) {
    "use server";
    try {
      await signIn("staff", formData);
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/admin/sign-in?error=CredentialsSignin");
      }
      throw error;
    }
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
        <StaffSignInForm action={signInAction} initialError={hasError ? "Invalid staff email or password." : null} />
        <p className="mt-6 text-xs text-ink-600">
          Credentials sign-in uses bcrypt password hashing and validated staff credentials.
        </p>
      </div>
    </div>
  );
}
