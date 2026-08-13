"use client";

import { useState } from "react";
import { validatePassword } from "@/lib/password";

interface StaffSignInFormProps {
  action: (formData: FormData) => Promise<void>;
  initialError?: string | null;
}

export function StaffSignInForm({ action, initialError }: StaffSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function handlePasswordChange(val: string) {
    setPassword(val);
    if (val.length > 0) {
      const validation = validatePassword(val);
      setErrors(validation.errors);
    } else {
      setErrors([]);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const validation = validatePassword(password);
    if (!validation.isValid) {
      e.preventDefault();
      setErrors(validation.errors);
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {initialError && (
        <div className="rounded-lg border border-signal-red/30 bg-signal-red/10 p-3 text-xs text-signal-red">
          {initialError}
        </div>
      )}

      <input type="hidden" name="redirectTo" value="/admin" />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-300">Staff email</span>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder="••••••••"
          className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20"
        />
      </label>

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-brass-400/20 bg-brass-400/5 p-3 text-xs text-brass-300">
          {errors.map((err, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span>•</span>
              <span>{err}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={errors.length > 0}
        className="mt-2 rounded-full bg-brass-400 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-300 disabled:opacity-50 disabled:pointer-events-none"
      >
        Sign in
      </button>
    </form>
  );
}
