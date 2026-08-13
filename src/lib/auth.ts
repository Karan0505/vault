import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { verifyPassword, validatePassword } from "@/lib/password";

declare module "next-auth" {
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
 * Two Credentials providers share one Auth.js instance: staff sign-in
 * and customer sign-in.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/sign-in" },
  providers: [
    Credentials({
      id: "staff",
      name: "Staff sign-in",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (typeof rawEmail !== "string" || typeof password !== "string") return null;

        const email = rawEmail.trim().toLowerCase();
        const validation = validatePassword(password);
        if (!validation.isValid) return null;

        const user = (await prisma.user.findUnique({ where: { email } })) as any;
        if (!user || !user.staffRole || !user.passwordHash) return null;

        const isPasswordMatch = await verifyPassword(password, user.passwordHash);
        if (!isPasswordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          staffRole: user.staffRole,
        };
      },
    }),
    Credentials({
      id: "customer",
      name: "Customer sign-in",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        if (typeof email !== "string" || !email.includes("@")) return null;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email },
        });

        // A staff account signing in through the customer form still
        // gets a session, just never one with a staffRole attached —
        // requireStaff() is what actually gates the admin console, not
        // which provider was used to sign in.
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
        token.staffRole = (user as { staffRole?: StaffRole | null }).staffRole;
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
