/** Shared signup UI + server validation; keep in a tiny module so client bundles do not pull in `retailerAuth`. */
export const RETAILER_PASSWORD_MIN = 8;
/** Upper bound only to limit scrypt work (not a “strength” rule). */
export const RETAILER_PASSWORD_MAX = 512;
