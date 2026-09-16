import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config) => config),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
  validatePassword: vi.fn(),
  hashPassword: vi.fn(),
}));

import { authConfig, authorizeUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import * as passwordModule from "@/lib/auth/password";

describe("Staff Authentication Provider Security & Bypass Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures the legacy unverified 'staff' provider is completely removed", () => {
    const staffProvider = authConfig.providers.find((p: any) => p.id === "staff");
    expect(staffProvider).toBeUndefined();
  });

  const credentialsProvider = authConfig.providers.find((p: any) => p.id === "credentials") as any;

  it("exists as the authoritative credentials provider for staff and customers", () => {
    expect(credentialsProvider).toBeDefined();
    expect(typeof credentialsProvider.authorize).toBe("function");
  });

  it("rejects staff sign-in when password is omitted", async () => {
    const mockAdmin = {
      id: "admin_1",
      email: "admin@vault.internal",
      name: "Admin User",
      passwordHash: "$2b$10$realAdminHash",
      staffRole: "admin",
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockAdmin);

    // Attacker sends only admin email without password
    const result = await authorizeUser({
      email: "admin@vault.internal",
    } as any);

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects staff sign-in when password is an empty string", async () => {
    const mockAdmin = {
      id: "admin_1",
      email: "admin@vault.internal",
      name: "Admin User",
      passwordHash: "$2b$10$realAdminHash",
      staffRole: "admin",
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockAdmin);

    const result = await authorizeUser({
      email: "admin@vault.internal",
      password: "",
    });

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects staff sign-in when staff user has null passwordHash", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "staff_nopass",
      email: "fulfilment@vault.internal",
      name: "Fulfilment User",
      passwordHash: null,
      staffRole: "fulfilment",
    });

    const result = await authorizeUser({
      email: "fulfilment@vault.internal",
      password: "AttemptPassword123!",
    });

    expect(result).toBeNull();
  });

  it("rejects staff sign-in when password verification fails", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "support_1",
      email: "support@vault.internal",
      name: "Support User",
      passwordHash: "$2b$10$realSupportHash",
      staffRole: "support",
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(false);

    const result = await authorizeUser({
      email: "support@vault.internal",
      password: "WrongPassword!",
    });

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).toHaveBeenCalledWith("WrongPassword!", "$2b$10$realSupportHash");
  });

  it("successfully authenticates admin staff with valid password and resolves ADMIN role", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "admin_1",
      email: "admin@vault.internal",
      name: "Admin User",
      passwordHash: "$2b$10$realAdminHash",
      staffRole: "admin",
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(true);

    const result = await authorizeUser({
      email: "admin@vault.internal",
      password: "ValidAdminPassword123!",
    });

    expect(result).toEqual({
      id: "admin_1",
      email: "admin@vault.internal",
      name: "Admin User",
      staffRole: "admin",
      role: "ADMIN",
    });
  });

  it("successfully authenticates fulfilment staff with valid password and resolves FULFILMENT role", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "fulfil_1",
      email: "fulfilment@vault.internal",
      name: "Fulfilment User",
      passwordHash: "$2b$10$realFulfilHash",
      staffRole: "fulfilment",
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(true);

    const result = await authorizeUser({
      email: "fulfilment@vault.internal",
      password: "ValidFulfilPassword123!",
    });

    expect(result).toEqual({
      id: "fulfil_1",
      email: "fulfilment@vault.internal",
      name: "Fulfilment User",
      staffRole: "fulfilment",
      role: "FULFILMENT",
    });
  });

  it("successfully authenticates support staff with valid password and resolves SUPPORT role", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "support_1",
      email: "support@vault.internal",
      name: "Support User",
      passwordHash: "$2b$10$realSupportHash",
      staffRole: "support",
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(true);

    const result = await authorizeUser({
      email: "support@vault.internal",
      password: "ValidSupportPassword123!",
    });

    expect(result).toEqual({
      id: "support_1",
      email: "support@vault.internal",
      name: "Support User",
      staffRole: "support",
      role: "SUPPORT",
    });
  });
});
