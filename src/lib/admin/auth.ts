import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { asBoolean } from "@/lib/admin/data";
import { getUserSafely } from "@/lib/supabase/server";
import type { GenericRow } from "@/lib/admin/data";

async function findProfileByField(admin: ReturnType<typeof createAdminClient>, field: string, value: string) {
  const { data, error } = await admin.from("profiles").select("*").eq(field, value).limit(1);

  if (error) {
    // Some deployments use a slightly different profiles schema, so keep trying
    // other candidate keys instead of failing on the first missing column.
    if (error.code === "42703" || error.code === "PGRST204") {
      return null;
    }

    throw new Error(`Unable to verify admin access: ${error.message}`);
  }

  const [profile] = (data ?? []) as GenericRow[];
  return profile ?? null;
}

async function findMatchingProfile(admin: ReturnType<typeof createAdminClient>, user: NonNullable<Awaited<ReturnType<typeof getUserSafely>>>) {
  const candidateChecks: Array<{ field: string; value: string | null | undefined }> = [
    { field: "id", value: user.id },
    { field: "user_id", value: user.id },
    { field: "profile_id", value: user.id },
    { field: "email", value: user.email },
  ];

  for (const candidate of candidateChecks) {
    if (!candidate.value) continue;

    const profile = await findProfileByField(admin, candidate.field, candidate.value);
    if (profile) {
      return profile;
    }
  }

  return null;
}

export async function requireAdminAccess() {
  const user = await getUserSafely();

  if (!user) {
    redirect("/?signin=required");
  }

  if (!isAdminConfigured()) {
    redirect("/?admin=config");
  }

  const admin = createAdminClient();
  const profile = await findMatchingProfile(admin, user);

  const isSuperadmin = asBoolean(profile?.is_superadmin) === true;
  const isMatrixAdmin = asBoolean(profile?.is_matrix_admin) === true;

  if (!profile || (!isSuperadmin && !isMatrixAdmin)) {
    redirect("/?denied=admin");
  }

  return {
    user,
    profile,
    roles: {
      isSuperadmin,
      isMatrixAdmin,
    },
  };
}

export const requireSuperadmin = requireAdminAccess;
