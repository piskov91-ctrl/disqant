export const ADMIN_AUTH_COOKIE = "disquant_admin_access";

export function isAdminAuthorizedCookieValue(value: string | undefined) {
  return value === "1";
}

