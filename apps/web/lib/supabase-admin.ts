import { createClient } from "@supabase/supabase-js";
import { requireServerEnv } from "./env";

export function getSupabaseAdmin() {
  const url = requireServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
