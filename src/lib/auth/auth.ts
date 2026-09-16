import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getEffectiveRole, type UserRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      staffRole?: StaffRole | null;
      role?: UserRole;
    };
  }

  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    staffRole?: StaffRole | null;
    role?: UserRole;
  }
}

export async function authorizeUser(credentials: Record<string, unknown> | undefined) {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== "string" || !email.includes("@")) {
    return null;
  }

  if (typeof password !== "string" || password.length === 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    return null;
  }

  const effectiveRole = getEffectiveRole(user);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    staffRole: user.staffRole,
    role: effectiveRole,
  };
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => authorizeUser(credentials),
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.staffRole = user.staffRole;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.staffRole = (token.staffRole as StaffRole | null) ?? null;
        session.user.role = (token.role as UserRole) ?? getEffectiveRole({ staffRole: session.user.staffRole });
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export const STAFF_ROLES: readonly StaffRole[] = ["admin", "fulfilment", "support"];

export function requireStaff(role: StaffRole | null): role is StaffRole {
  return role !== null && STAFF_ROLES.includes(role);
}

export function verifyOrderAccess(
  order: { userId: string | null },
  session: { user?: { id?: string; staffRole?: StaffRole | null } } | null,
  _token?: string | null
): boolean {
  if (session?.user?.staffRole && requireStaff(session.user.staffRole)) {
    return true;
  }
  if (order.userId) {
    return Boolean(session?.user?.id && session.user.id === order.userId);
  }
  return false;
}
