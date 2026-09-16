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
      upsert: vi.fn(),
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

describe("Customer Authentication Provider Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures the insecure passwordless 'customer' provider is completely removed", () => {
    const customerProvider = authConfig.providers.find((p: any) => p.id === "customer");
    expect(customerProvider).toBeUndefined();
  });

  const credentialsProvider = authConfig.providers.find((p: any) => p.id === "credentials") as any;

  it("exists as the authoritative credentials provider", () => {
    expect(credentialsProvider).toBeDefined();
    expect(typeof credentialsProvider.authorize).toBe("function");
  });

  it("rejects authentication if email is missing, invalid, or malformed", async () => {
    expect(await authorizeUser({ email: "invalid", password: "Password123!" })).toBeNull();
    expect(await authorizeUser({ email: "", password: "Password123!" })).toBeNull();
    expect(await authorizeUser({ password: "Password123!" } as any)).toBeNull();
  });

  it("rejects passwordless authentication attempt on customer account", async () => {
    const mockUser = {
      id: "user_123",
      email: "victim@example.com",
      name: "Victim Customer",
      passwordHash: "$2b$10$hashedPasswordValue",
      staffRole: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    // Attempting login with only email (no password)
    const result = await authorizeUser({
      email: "victim@example.com",
    } as any);

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects authentication if password is an empty string", async () => {
    const mockUser = {
      id: "user_123",
      email: "victim@example.com",
      name: "Victim Customer",
      passwordHash: "$2b$10$hashedPasswordValue",
      staffRole: null,
    };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const result = await authorizeUser({
      email: "victim@example.com",
      password: "",
    });

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects authentication if user does not exist in database", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const result = await authorizeUser({
      email: "nonexistent@example.com",
      password: "Password123!",
    });

    expect(result).toBeNull();
  });

  it("rejects authentication if user account has no passwordHash configured", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user_nopass",
      email: "nopass@example.com",
      passwordHash: null,
      staffRole: null,
    });

    const result = await authorizeUser({
      email: "nopass@example.com",
      password: "Password123!",
    });

    expect(result).toBeNull();
  });

  it("rejects authentication if password does not match hash", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user_123",
      email: "customer@example.com",
      passwordHash: "$2b$10$realHash",
      staffRole: null,
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(false);

    const result = await authorizeUser({
      email: "customer@example.com",
      password: "WrongPassword!",
    });

    expect(result).toBeNull();
    expect(passwordModule.verifyPassword).toHaveBeenCalledWith("WrongPassword!", "$2b$10$realHash");
  });

  it("successfully authenticates customer with valid credentials and resolves CUSTOMER role", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user_123",
      email: "customer@example.com",
      name: "John Doe",
      passwordHash: "$2b$10$realHash",
      staffRole: null,
    });
    (passwordModule.verifyPassword as any).mockResolvedValue(true);

    const result = await authorizeUser({
      email: "customer@example.com",
      password: "CorrectPassword123!",
    });

    expect(result).toEqual({
      id: "user_123",
      email: "customer@example.com",
      name: "John Doe",
      staffRole: null,
      role: "CUSTOMER",
    });
  });
});
