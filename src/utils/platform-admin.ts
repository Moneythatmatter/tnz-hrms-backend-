import type { AuthedRequest } from "../middleware/auth.js";

/** Super admin flag or legacy Admin role — platform user/property management. */
export function isPlatformAdmin(
  auth?: { isSuperAdmin?: boolean; role?: string } | null,
): boolean {
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;
  const role = String(auth.role ?? "").trim().toLowerCase();
  return role === "admin" || role === "administrator";
}
