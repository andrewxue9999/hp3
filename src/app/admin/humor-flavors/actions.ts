"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/auth";
import { asNumber, asString, type GenericRow } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlavorFieldKey, getFlavorForeignKey, getFlavorOrderField } from "@/lib/humor-flavors";

const FLAVOR_NAME_KEYS = ["name", "title", "label"];
const FLAVOR_SLUG_KEYS = ["slug", "code", "key"];
const FLAVOR_DESCRIPTION_KEYS = ["description", "summary", "notes"];
const FLAVOR_ACTIVE_KEYS = ["is_active", "is_enabled", "enabled", "active"];
const STEP_NAME_KEYS = ["name", "title", "label"];
const STEP_DESCRIPTION_KEYS = ["description", "summary", "notes"];
const STEP_SYSTEM_PROMPT_KEYS = ["system_prompt", "prompt"];
const STEP_USER_PROMPT_KEYS = ["user_prompt", "instructions"];
const STEP_TEMPERATURE_KEYS = ["temperature"];
const TIMESTAMP_KEYS = [
  "created_datetime_utc",
  "modified_datetime_utc",
  "created_at_utc",
  "modified_at_utc",
  "created_at",
  "updated_at",
];

function buildRedirect(message: string, status: "success" | "error", flavorId?: string | null) {
  const params = new URLSearchParams({ status, message });
  if (flavorId) {
    params.set("flavor", flavorId);
  }

  redirect(`/admin/humor-flavors?${params.toString()}`);
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") === true;
}

async function mutateWithColumnFallback(
  operation: () => PromiseLike<{ error: { code?: string; message: string } | null }>,
  payload: Record<string, unknown>,
  fallbackKeys: string[],
) {
  let response = await operation();
  const remainingFallbacks = [...fallbackKeys];

  while (response.error && isMissingColumnError(response.error) && remainingFallbacks.length > 0) {
    const key = remainingFallbacks.shift();
    if (!key) break;
    delete payload[key];
    response = await operation();
  }

  if (response.error) {
    throw new Error(response.error.message);
  }
}

function setValueIfPresent(payload: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined) return;
  payload[key] = value;
}

function parseCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
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

function touchTimestamps(payload: Record<string, unknown>, sample: GenericRow | null, mode: "create" | "update") {
  const now = new Date().toISOString();
  const availableKeys = new Set(sample ? Object.keys(sample) : TIMESTAMP_KEYS);

  for (const key of TIMESTAMP_KEYS) {
    if (!availableKeys.has(key)) continue;

    if (mode === "create" && (key === "created_datetime_utc" || key === "created_at_utc" || key === "created_at")) {
      payload[key] = now;
    }

    if (key === "modified_datetime_utc" || key === "modified_at_utc" || key === "updated_at") {
      payload[key] = now;
    }
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

function buildFlavorPayload(formData: FormData, sample: GenericRow | null, mode: "create" | "update") {
  const payload: Record<string, unknown> = {};
  const nameKey = getFlavorFieldKey(sample, FLAVOR_NAME_KEYS, "name");
  const slugKey = getFlavorFieldKey(sample, FLAVOR_SLUG_KEYS, "slug");
  const descriptionKey = getFlavorFieldKey(sample, FLAVOR_DESCRIPTION_KEYS, "description");
  const activeKey = getFlavorFieldKey(sample, FLAVOR_ACTIVE_KEYS, "is_active");

  setValueIfPresent(payload, nameKey, parseRequiredText(formData, "name", "Flavor name"));
  setValueIfPresent(payload, slugKey, parseOptionalText(formData, "slug"));
  setValueIfPresent(payload, descriptionKey, parseOptionalText(formData, "description"));
  setValueIfPresent(payload, activeKey, parseCheckbox(formData, "is_active"));
  touchTimestamps(payload, sample, mode);

  return {
    payload,
    fallbackKeys: [slugKey, descriptionKey, activeKey].filter((key) => !(sample && key in sample)),
  };
}

function buildStepPayload(formData: FormData, stepSample: GenericRow | null, flavorId: string, mode: "create" | "update") {
  const payload: Record<string, unknown> = {};
  const nameKey = getFlavorFieldKey(stepSample, STEP_NAME_KEYS, "name");
  const descriptionKey = getFlavorFieldKey(stepSample, STEP_DESCRIPTION_KEYS, "description");
  const systemPromptKey = getFlavorFieldKey(stepSample, STEP_SYSTEM_PROMPT_KEYS, "system_prompt");
  const userPromptKey = getFlavorFieldKey(stepSample, STEP_USER_PROMPT_KEYS, "user_prompt");
  const temperatureKey = getFlavorFieldKey(stepSample, STEP_TEMPERATURE_KEYS, "temperature");
  const orderKey = getFlavorOrderField(stepSample);
  const flavorKey = getFlavorForeignKey(stepSample);

  setValueIfPresent(payload, flavorKey, flavorId);
  setValueIfPresent(payload, nameKey, parseRequiredText(formData, "step_name", "Step name"));
  setValueIfPresent(payload, descriptionKey, parseOptionalText(formData, "step_description"));
  setValueIfPresent(payload, systemPromptKey, parseOptionalText(formData, "system_prompt"));
  setValueIfPresent(payload, userPromptKey, parseOptionalText(formData, "user_prompt"));
  setValueIfPresent(payload, temperatureKey, parseOptionalNumber(formData, "temperature"));

  const stepOrder = parseOptionalNumber(formData, "step_order");
  if (stepOrder !== null) {
    payload[orderKey] = stepOrder;
  }

  touchTimestamps(payload, stepSample, mode);

  return {
    payload,
    fallbackKeys: [descriptionKey, systemPromptKey, userPromptKey, temperatureKey, orderKey, flavorKey].filter(
      (key) => !(stepSample && key in stepSample),
    ),
  };
}

export async function createFlavorAction(formData: FormData) {
  await requireAdminAccess();

  try {
    const admin = createAdminClient();
    const { flavorSample } = await loadSamples();
    const { payload, fallbackKeys } = buildFlavorPayload(formData, flavorSample, "create");
    await mutateWithColumnFallback(() => admin.from("humor_flavors").insert(payload), payload, fallbackKeys);
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor created.", "success");
  } catch (error) {
    buildRedirect(error instanceof Error ? error.message : "Unable to create humor flavor.", "error");
  }
}

export async function updateFlavorAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const { data: flavorRows = [], error: flavorError } = await admin.from("humor_flavors").select("*").eq("id", flavorId).limit(1);
    if (flavorError) {
      throw new Error(flavorError.message);
    }

    const flavorSample = (((flavorRows as GenericRow[])[0] ?? null) as GenericRow | null);
    const { payload, fallbackKeys } = buildFlavorPayload(formData, flavorSample, "update");
    await mutateWithColumnFallback(
      () => admin.from("humor_flavors").update(payload).eq("id", flavorId),
      payload,
      fallbackKeys,
    );
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor updated.", "success", flavorId);
  } catch (error) {
    buildRedirect(error instanceof Error ? error.message : "Unable to update humor flavor.", "error", flavorId);
  }
}

export async function deleteFlavorAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const admin = createAdminClient();

  try {
    const { stepSample } = await loadSamples();
    const flavorKey = getFlavorForeignKey(stepSample);
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
    buildRedirect(error instanceof Error ? error.message : "Unable to delete humor flavor.", "error", flavorId);
  }
}

export async function createStepAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const { stepSample } = await loadSamples();
    const { payload, fallbackKeys } = buildStepPayload(formData, stepSample, flavorId, "create");
    await mutateWithColumnFallback(() => admin.from("humor_flavor_steps").insert(payload), payload, fallbackKeys);
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor step created.", "success", flavorId);
  } catch (error) {
    buildRedirect(error instanceof Error ? error.message : "Unable to create step.", "error", flavorId);
  }
}

export async function updateStepAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");
  const stepId = parseRequiredText(formData, "step_id", "Step");

  try {
    const admin = createAdminClient();
    const { data: stepRows = [], error: stepError } = await admin.from("humor_flavor_steps").select("*").eq("id", stepId).limit(1);
    if (stepError) {
      throw new Error(stepError.message);
    }

    const stepSample = (((stepRows as GenericRow[])[0] ?? null) as GenericRow | null);
    const { payload, fallbackKeys } = buildStepPayload(formData, stepSample, flavorId, "update");
    await mutateWithColumnFallback(
      () => admin.from("humor_flavor_steps").update(payload).eq("id", stepId),
      payload,
      fallbackKeys,
    );
    revalidatePath("/admin/humor-flavors");
    buildRedirect("Humor flavor step updated.", "success", flavorId);
  } catch (error) {
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
    buildRedirect(error instanceof Error ? error.message : "Unable to delete step.", "error", flavorId);
  }
}

async function loadFlavorStepRows(flavorId: string) {
  const admin = createAdminClient();
  const { stepSample } = await loadSamples();
  const flavorKey = getFlavorForeignKey(stepSample);
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
    const orderKey = getFlavorOrderField(rows[0] ?? null);
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
    buildRedirect(error instanceof Error ? error.message : "Unable to reorder step.", "error", flavorId);
  }
}

export async function normalizeStepOrderAction(formData: FormData) {
  await requireAdminAccess();

  const flavorId = parseRequiredText(formData, "flavor_id", "Flavor");

  try {
    const admin = createAdminClient();
    const rows = await loadFlavorStepRows(flavorId);
    const orderKey = getFlavorOrderField(rows[0] ?? null);
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
    buildRedirect(error instanceof Error ? error.message : "Unable to normalize steps.", "error", flavorId);
  }
}
