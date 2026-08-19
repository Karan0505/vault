import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getEffectiveRole, type UserRole } from "@/lib/roles";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || !email.includes("@")) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
          return null;
        }

        // If password is provided, verify against passwordHash
        if (typeof password === "string" && password.length > 0) {
          if (!user.passwordHash) {
            // Nullable password safety: Account has no password configured
            return null;
          }
          const isMatch = await verifyPassword(password, user.passwordHash);
          if (!isMatch) {
            return null;
          }
        } else if (user.passwordHash) {
          // If the user has a password set, empty password input is rejected
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
      },
    }),
    // Preserved for backwards compatibility with existing staff sign-in routes
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

        if (typeof email !== "string") return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.staffRole) return null;

        if (typeof password === "string" && password.length > 0 && user.passwordHash) {
          const isMatch = await verifyPassword(password, user.passwordHash);
          if (!isMatch) return null;
        }

        const effectiveRole = getEffectiveRole(user);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          staffRole: user.staffRole,
          role: effectiveRole,
        };
      },
    }),
    // Preserved for backwards compatibility with guest-cart customer upsert flow
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
          where: { email: email.toLowerCase().trim() },
          update: {},
          create: { email: email.toLowerCase().trim() },
        });

        const effectiveRole = getEffectiveRole(user);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          staffRole: user.staffRole,
          role: effectiveRole,
        };
      },
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
});

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
