export const DEMO_AUTH_COOKIE = "disquant_demo_access";

export function isDemoAuthorizedCookieValue(value: string | undefined) {
  return value === "1";
}

