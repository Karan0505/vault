import { describe, expect, it } from "vitest";
import { validatePassword, hashPassword, verifyPassword } from "../password";

describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const res = validatePassword("Ab1!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must be at least 8 characters.");
  });

  it("rejects passwords without a number", () => {
    const res = validatePassword("Password!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one number.");
  });

  it("rejects passwords without a special character", () => {
    const res = validatePassword("Password123");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one special character.");
  });

  it("accepts valid passwords meeting all criteria", () => {
    const res = validatePassword("Vault2026!");
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});

describe("hashPassword & verifyPassword", () => {
  it("hashes password into a bcrypt hash string and verifies correctly", async () => {
    const raw = "Vault2026!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("WrongPass123!", hash);
    expect(isWrong).toBe(false);
  });

  it("throws an error when hashing an invalid password", async () => {
    await expect(hashPassword("short")).rejects.toThrow(
      "Password does not meet security requirements."
    );
  });
});
