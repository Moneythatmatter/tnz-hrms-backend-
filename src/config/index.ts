/**
 * Application config — single place for env + runtime settings.
 */
function required(name: string, ...fallbacks: (string | undefined)[]): string {
  for (const value of [process.env[name], ...fallbacks]) {
    if (value) return value;
  }
  throw new Error(`Missing required env: ${name}`);
}

export const config = {
  port: Number(process.env.PORT) || 5002,
  jwtSecret:
    process.env.JWT_SECRET || "pms-dev-jwt-secret-change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  supabase: {
    url: () =>
      required(
        "SUPABASE_URL",
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      ),
    anonKey: () =>
      required(
        "SUPABASE_ANON_KEY",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
    /** Server-side only — bypasses RLS when set (recommended for Express API). */
    serviceRoleKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
} as const;
