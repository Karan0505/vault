import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    staffRole?: StaffRole | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      staffRole: StaffRole | null;
    };
  }
}

/**
 * Phase 1 needs just enough auth to gate the admin console behind a
 * staff role. Customer-facing sign-in (magic link / OAuth) and the
 * cart-merge-on-login flow are Phase 2 scope — see
 * docs/decisions/0004-auth-scope-by-phase.md.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/sign-in" },
  providers: [
    Credentials({
      name: "Staff sign-in",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || !email) return null;
        if (typeof password !== "string" || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.staffRole) return null;

        if (user.password) {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          staffRole: user.staffRole,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.staffRole = user.staffRole;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub ?? "";
      session.user.staffRole = (token.staffRole as StaffRole | null) ?? null;
      return session;
    },
  },
});

export const STAFF_ROLES: readonly StaffRole[] = ["admin", "fulfilment", "support"];

export function requireStaff(role: StaffRole | null): role is StaffRole {
  return role !== null && STAFF_ROLES.includes(role);
}
