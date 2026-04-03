"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/auth";
import { asNumber, asString, type GenericRow } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlavorForeignKey, getFlavorOrderField } from "@/lib/humor-flavors";
const TIMESTAMP_KEYS = [
  "created_datetime_utc",
  "modified_datetime_utc",
  "created_at_utc",
  "modified_at_utc",
  "created_at",
  "updated_at",
];

function isRedirectLikeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.includes("NEXT_REDIRECT")
  );
}

function buildRedirect(message: string, status: "success" | "error", flavorId?: string | null) {
  const params = new URLSearchParams({ status, message });
  if (flavorId) {
    params.set("flavor", flavorId);
  }

  redirect(`/admin/humor-flavors?${params.toString()}`);
}

function setValueIfPresent(payload: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined) return;
  payload[key] = value;
}

function parseRequiredText(formData: FormData, key: string, label: string) {
  const value = asString(formData.get(key));
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function parseOptionalText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function touchTimestamps(payload: Record<string, unknown>, sample: GenericRow | null) {
  const availableKeys = new Set(sample ? Object.keys(sample) : TIMESTAMP_KEYS);
  for (const key of TIMESTAMP_KEYS) {
    if (!availableKeys.has(key)) continue;
    delete payload[key];
  }
}

async function loadSamples() {
  const admin = createAdminClient();
  const [{ data: flavorRows = [] }, { data: stepRows = [] }] = await Promise.all([
    admin.from("humor_flavors").select("*").limit(1),
    admin.from("humor_flavor_steps").select("*").limit(1),
  ]);

  return {
    flavorSample: ((flavorRows as GenericRow[])[0] ?? null) as GenericRow | null,
    stepSample: ((stepRows as GenericRow[])[0] ?? null) as GenericRow | null,
  };
}

function buildFlavorPayload(formData: FormData, sample: GenericRow | null, mode: "create" | "update", actorProfileId: string) {
  const payload: Record<string, unknown> = {};
  setValueIfPresent(payload, "slug", parseRequiredText(formData, "slug", "Flavor slug"));
  setValueIfPresent(payload, "description", parseOptionalText(formData, "description"));
  payload.modified_by_user_id = actorProfileId;
  if (mode === "create") {
    payload.created_by_user_id = actorProfileId;
  }
  touchTimestamps(payload, sample);

  return payload;
}

function buildStepPayload(
  formData: FormData,
  stepSample: GenericRow | null,
  flavorId: string,
  mode: "create" | "update",
  actorProfileId: string,
) {
  const payload: Record<string, unknown> = {};
  const orderKey = getFlavorOrderField();
  const flavorKey = getFlavorForeignKey();
  const inputTypeId = parseOptionalNumber(formData, "input_type_id") ?? asNumber(stepSample?.llm_input_type_id);
  const outputTypeId = parseOptionalNumber(formData, "output_type_id") ?? asNumber(stepSample?.llm_output_type_id);
  const modelId = parseOptionalNumber(formData, "model_id") ?? asNumber(stepSample?.llm_model_id);
  const stepTypeId = parseOptionalNumber(formData, "step_type_id") ?? asNumber(stepSample?.humor_flavor_step_type_id);

  setValueIfPresent(payload, flavorKey, flavorId);
  setValueIfPresent(payload, "description", parseOptionalText(formData, "step_description"));
  setValueIfPresent(payload, "llm_system_prompt", parseOptionalText(formData, "system_prompt"));
  setValueIfPresent(payload, "llm_user_prompt", parseOptionalText(formData, "user_prompt"));
  setValueIfPresent(payload, "llm_temperature", parseOptionalNumber(formData, "temperature"));
  setValueIfPresent(payload, "llm_input_type_id", inputTypeId);
  setValueIfPresent(payload, "llm_output_type_id", outputTypeId);
  setValueIfPresent(payload, "llm_model_id", modelId);
  setValueIfPresent(payload, "humor_flavor_step_type_id", stepTypeId);

  const stepOrder = parseOptionalNumber(formData, "step_order");
  if (stepOrder !== null) {
    payload[orderKey] = stepOrder;
  }

  payload.modified_by_user_id = actorProfileId;
  if (mode === "create") {
    payload.created_by_user_id = actorProfileId;
  }
  touchTimestamps(payload, stepSample);

  return payload;
}

export async function createFlavorAction(formData: FormData) {
  const { profile } = await requireAdminAccess();

  try {
    const admin = createAdminClient();
    const { flavorSample } = await loadSamples();
    const payload = buildFlavorPayload(formData, flavorSample, "create", String(profile.id));
    const { error } = await admin.from("humor_flavors").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor created.", "success");
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to create humor flavor.", "error");
  }
}

export async function updateFlavorAction(formData: FormData) {
  const { profile } = await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const { data: flavorRows = [], error: flavorError } = await admin.from("humor_flavors").select("*").eq("id", flavorId).limit(1);
    if (flavorError) {
      throw new Error(flavorError.message);
    }

    const flavorSample = (((flavorRows as GenericRow[])[0] ?? null) as GenericRow | null);
    const payload = buildFlavorPayload(formData, flavorSample, "update", String(profile.id));
    const { error } = await admin.from("humor_flavors").update(payload).eq("id", flavorId);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor updated.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to update humor flavor.", "error", flavorId);
  }
}

export async function deleteFlavorAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const admin = createAdminClient();

  try {
    const flavorKey = getFlavorForeignKey();
    const { error: stepError } = await admin.from("humor_flavor_steps").delete().eq(flavorKey, flavorId);
    if (stepError) {
      throw new Error(stepError.message);
    }

    const { error } = await admin.from("humor_flavors").delete().eq("id", flavorId);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor deleted.", "success");
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to delete humor flavor.", "error", flavorId);
  }
}

export async function createStepAction(formData: FormData) {
  const { profile } = await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const { stepSample } = await loadSamples();
    const payload = buildStepPayload(formData, stepSample, flavorId, "create", String(profile.id));
    const { error } = await admin.from("humor_flavor_steps").insert(payload);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor step created.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to create step.", "error", flavorId);
  }
}

export async function updateStepAction(formData: FormData) {
  const { profile } = await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const stepId = parseRequiredText(formData, "step_id", "Step");

  try {
    const admin = createAdminClient();
    const { data: stepRows = [], error: stepError } = await admin.from("humor_flavor_steps").select("*").eq("id", stepId).limit(1);
    if (stepError) {
      throw new Error(stepError.message);
    }

    const stepSample = (((stepRows as GenericRow[])[0] ?? null) as GenericRow | null);
    const payload = buildStepPayload(formData, stepSample, flavorId, "update", String(profile.id));
    const { error } = await admin.from("humor_flavor_steps").update(payload).eq("id", stepId);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor step updated.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to update step.", "error", flavorId);
  }
}

export async function deleteStepAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const stepId = parseRequiredText(formData, "step_id", "Step");
  const admin = createAdminClient();

  try {
    const { error } = await admin.from("humor_flavor_steps").delete().eq("id", stepId);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor step deleted.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to delete step.", "error", flavorId);
  }
}

async function loadFlavorStepRows(flavorId: string) {
  const admin = createAdminClient();
  const flavorKey = getFlavorForeignKey();
  const { data, error } = await admin.from("humor_flavor_steps").select("*").eq(flavorKey, flavorId);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GenericRow[];
}

export async function reorderStepAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const stepId = parseRequiredText(formData, "step_id", "Step");
  const direction = asString(formData.get("direction"));

  if (!direction || !["up", "down"].includes(direction)) {
    buildRedirect("Invalid reorder direction.", "error", flavorId);
  }

  try {
    const admin = createAdminClient();
    const rows = await loadFlavorStepRows(flavorId);
    const orderKey = getFlavorOrderField();
    const ordered = rows.sort((left, right) => {
      const leftValue = asNumber(left[orderKey]) ?? Number.MAX_SAFE_INTEGER;
      const rightValue = asNumber(right[orderKey]) ?? Number.MAX_SAFE_INTEGER;
      if (leftValue !== rightValue) return leftValue - rightValue;
      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    });
    const index = ordered.findIndex((row) => asString(row.id) === stepId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) {
      buildRedirect("Step is already at that edge.", "error", flavorId);
    }

    const current = ordered[index];
    const other = ordered[swapIndex];
    const currentOrder = asNumber(current[orderKey]) ?? index + 1;
    const otherOrder = asNumber(other[orderKey]) ?? swapIndex + 1;

    const { error: currentError } = await admin.from("humor_flavor_steps").update({ [orderKey]: otherOrder }).eq("id", stepId);
    if (currentError) {
      throw new Error(currentError.message);
    }

    const { error: otherError } = await admin.from("humor_flavor_steps").update({ [orderKey]: currentOrder }).eq("id", asString(other.id));
    if (otherError) {
      throw new Error(otherError.message);
    }

    revalidatePath("/admin/humor-flavors");
    buildRedirect("Step order updated.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to reorder step.", "error", flavorId);
  }
}

export async function normalizeStepOrderAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const rows = await loadFlavorStepRows(flavorId);
    const orderKey = getFlavorOrderField();
    const ordered = rows.sort((left, right) => {
      const leftValue = asNumber(left[orderKey]) ?? Number.MAX_SAFE_INTEGER;
      const rightValue = asNumber(right[orderKey]) ?? Number.MAX_SAFE_INTEGER;
      if (leftValue !== rightValue) return leftValue - rightValue;
      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    });

    for (const [index, row] of ordered.entries()) {
      const expected = index + 1;
      if ((asNumber(row[orderKey]) ?? -1) === expected) continue;
      const { error } = await admin.from("humor_flavor_steps").update({ [orderKey]: expected }).eq("id", asString(row.id));
      if (error) {
        throw new Error(error.message);
      }
    }

    revalidatePath("/admin/humor-flavors");
    buildRedirect("Step order normalized.", "success", flavorId);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }
    buildRedirect(error instanceof Error ? error.message : "Unable to normalize steps.", "error", flavorId);
  }
}
