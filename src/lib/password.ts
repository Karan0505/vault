import bcrypt from "bcryptjs";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password rules:
 * - At least 8 characters
 * - At least one number (0-9)
 * - At least one special character (@, #, $, %, !, etc.)
 *
 * Never logs or exposes password values.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  if (!/\d/.test(password || "")) {
    errors.push("Password must contain at least one number.");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || "")) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a plaintext password securely using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error("Password does not meet security requirements.");
  }
  const SALT_ROUNDS = 10;
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
