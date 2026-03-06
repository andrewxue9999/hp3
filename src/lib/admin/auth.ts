import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getUserSafely } from "@/lib/supabase/server";
import type { GenericRow } from "@/lib/admin/data";

export async function requireSuperadmin() {
  const user = await getUserSafely();

  if (!user) {
    redirect("/?signin=required");
  }

  if (!isAdminConfigured()) {
    redirect("/?admin=config");
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<GenericRow>();

  if (error) {
    throw new Error(`Unable to verify superadmin access: ${error.message}`);
  }

  if (!profile || profile.is_superadmin !== true) {
    redirect("/?denied=superadmin");
  }

  return {
    user,
    profile,
  };
}
