import { DatabaseError } from "../errors/index.js";

const RLS_HINT =
  "Supabase Row Level Security blocked this write. " +
  "Fix (pick one): (1) Add SUPABASE_SERVICE_ROLE_KEY to backend/.env and restart the backend, " +
  "or (2) run backend/sql/human-resources-rls-patch.sql in the Supabase SQL Editor.";

export function throwIfRlsError(message: string): never {
  if (/row-level security/i.test(message)) {
    throw new DatabaseError(RLS_HINT);
  }
  throw new Error(message);
}
