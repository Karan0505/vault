import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getCurrentUserId, getCurrentUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

describe("Session Lookup Fail-Closed Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session exists", async () => {
    (auth as any).mockResolvedValue(null);
    expect(await getCurrentUserId()).toBeNull();
    expect(await getCurrentUser()).toBeNull();
  });

  it("fails closed (returns null) on database query error rather than returning unverified JWT claim", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "stale_jwt_id_123", email: "stale@example.com" },
    });
    (prisma.user.findUnique as any).mockRejectedValue(new Error("Database connection lost"));

    expect(await getCurrentUserId()).toBeNull();
    expect(await getCurrentUser()).toBeNull();
  });

  it("fails closed (returns null) when user record no longer exists in database", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "deleted_user_id", email: "deleted@example.com" },
    });
    (prisma.user.findUnique as any).mockResolvedValue(null);

    expect(await getCurrentUserId()).toBeNull();
    expect(await getCurrentUser()).toBeNull();
  });

  it("resolves user id when user exists in database", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "valid_user_id", email: "valid@example.com", name: "Valid User" },
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "valid_user_id",
      email: "valid@example.com",
      name: "Valid User",
    });

    expect(await getCurrentUserId()).toBe("valid_user_id");
    expect(await getCurrentUser()).toEqual({
      id: "valid_user_id",
      email: "valid@example.com",
      name: "Valid User",
    });
  });
});
