import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const supabaseAdminConfigError =
  "Missing Supabase admin environment variable. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY on the server.";

function getAdminKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function isAdminConfigured() {
  return Boolean(getAdminKey());
}

export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();
  const serviceRoleKey = getAdminKey();

  if (!serviceRoleKey) {
    throw new Error(supabaseAdminConfigError);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
