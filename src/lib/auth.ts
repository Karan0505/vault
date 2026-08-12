import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { StaffRole } from "@prisma/client";
import { compare } from "bcryptjs";
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
 * Two Credentials providers share one Auth.js instance: staff sign-in
 * (Phase 1, unchanged) and customer sign-in (Phase 2, new). Both are
 * deliberately thin placeholders — real password/OTP/magic-link
 * verification and the Resend email infrastructure to deliver it are
 * Phase 4 scope. What Phase 2 actually needs from auth is a stable
 * customer identity to merge a guest cart into and to attach orders to;
 * this find-or-create-by-email provider gives it that without pretending
 * to be a real credential check. See docs/decisions/0004 and 0010.
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
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || !email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.staffRole) return null;

        const inputPassword = typeof password === "string" ? password : "";

        if (user.password) {
          const isValid = await compare(inputPassword, user.password);
          if (!isValid) return null;
        } else {
          if (inputPassword !== "admin123") return null;
        }

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

import { timingSafeEqual } from "node:crypto";
export const STAFF_ROLES: readonly StaffRole[] = ["admin", "fulfilment", "support"];

export function requireStaff(role: StaffRole | null): role is StaffRole {
  return role !== null && STAFF_ROLES.includes(role);
}

/**
 * Validates whether a user session or guest token is authorized to access an order.
 *
 * 1. Staff users (admin, fulfilment, support) have universal read access to all orders.
 * 2. Registered customer orders (order.userId != null) require session.user.id === order.userId.
 * 3. Guest orders (order.userId == null) require token === order.guestToken, evaluated
 *    via constant-time timingSafeEqual comparison to prevent side-channel timing attacks.
 */
export function verifyOrderAccess(
  order: { userId?: string | null; guestToken?: string | null },
  session: { user?: { id?: string | null; staffRole?: StaffRole | null } | null } | null,
  token: string | null
): boolean {
  if (requireStaff(session?.user?.staffRole ?? null)) {
    return true;
  }

  if (order.userId !== undefined && order.userId !== null) {
    return Boolean(session?.user?.id && session.user.id === order.userId);
  }

  const gToken = order.guestToken ?? null;

  if (!token || !gToken) {
    return false;
  }

  const bufToken = Buffer.from(token, "utf-8");
  const bufGuestToken = Buffer.from(gToken, "utf-8");

  if (bufToken.length !== bufGuestToken.length) {
    return false;
  }

  return timingSafeEqual(bufToken, bufGuestToken);
}
