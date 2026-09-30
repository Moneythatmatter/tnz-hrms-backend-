import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { config } from "../config/index.js";

/** Prefer service role on the server so API writes are not blocked by RLS. */
const usingServiceRole = Boolean(config.supabase.serviceRoleKey());
const supabaseKey =
  config.supabase.serviceRoleKey() ?? config.supabase.anonKey();

if (!usingServiceRole && process.env.NODE_ENV !== "test") {
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set — using anon key. " +
      "Run backend/sql/human-resources-rls-patch.sql in Supabase if writes fail RLS.",
  );
}

export const supabase = createClient(config.supabase.url(), supabaseKey);

const supabaseHost = config.supabase.url().replace(/^https?:\/\//, "").split("/")[0];

export async function verifySupabaseConnection(): Promise<void> {
  const { error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase connection failed (${supabaseHost}): ${error.message}. ` +
        "Check backend/.env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and run sql/setup-hrms-database.sql.",
    );
  }
}

export function getSupabaseHost(): string {
  return supabaseHost;
}
