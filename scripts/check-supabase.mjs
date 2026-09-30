import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or API key in backend/.env");
  process.exit(1);
}

const host = url.replace(/^https?:\/\//, "").split("/")[0];
console.log("Supabase host:", host);
console.log("Key type:", key.startsWith("eyJ") ? "jwt" : key.slice(0, 12) + "…");

const sb = createClient(url, key);
const t0 = Date.now();
const { data, error } = await sb.from("users").select("email").limit(1);
console.log("Query ms:", Date.now() - t0);
if (error) {
  console.error("Query error:", error.message);
  process.exit(2);
}
console.log("users table OK, sample count:", data?.length ?? 0);
