/** Shared signup UI + server validation; keep in a tiny module so client bundles do not pull in `retailerAuth`. */
export const RETAILER_PASSWORD_MIN = 8;
/** Upper bound only to limit scrypt work (not a “strength” rule). */
export const RETAILER_PASSWORD_MAX = 512;

/** Allowed special symbols (must match validation regex). */
export const RETAILER_PASSWORD_SPECIAL = "!@#$%^&*" as const;

/** Shown under the password field on signup. */
export const RETAILER_PASSWORD_RULES_SUMMARY = [
  `At least ${RETAILER_PASSWORD_MIN} characters`,
  "At least one uppercase letter (A–Z)",
  "At least one number (0–9)",
  `At least one special character (${[...RETAILER_PASSWORD_SPECIAL].join(" ")})`,
] as const;

/**
 * @returns An error message if invalid, or `null` if the password meets all rules.
 */
export function validateRetailerPasswordStrength(password: string): string | null {
  if (password.length < RETAILER_PASSWORD_MIN) {
    return `Password must be at least ${RETAILER_PASSWORD_MIN} characters.`;
  }
  if (password.length > RETAILER_PASSWORD_MAX) {
    return `Password must be at most ${RETAILER_PASSWORD_MAX} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return "Password must include at least one special character: ! @ # $ % ^ & *";
  }
  return null;
}
