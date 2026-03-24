"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminTableConfig, getEditableFields, isTimestampKey } from "@/lib/admin/config";
import { asString, type GenericRow } from "@/lib/admin/data";
import { requireSuperadmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const imageBucket = process.env.SUPABASE_IMAGE_UPLOAD_BUCKET ?? "images";

function isRedirectLikeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.includes("NEXT_REDIRECT")
  );
}

function isMissingTableError(message: string) {
  return message.includes("Could not find the table") || message.includes("schema cache");
}

async function resolveTableName(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  aliases: string[] = [],
) {
  const candidates = [table, ...aliases];

  for (const candidate of candidates) {
    const { error } = await admin.from(candidate).select("*").limit(1);
    if (!error) {
      return candidate;
    }

    if (!isMissingTableError(error.message)) {
      throw new Error(error.message);
    }
  }

  throw new Error(`Could not find any matching table for ${table}.`);
}

function buildRedirect(path: string, status: "success" | "error", message: string) {
  const params = new URLSearchParams({ status, message });
  redirect(`${path}?${params.toString()}`);
}

function parseEditableKeys(formData: FormData) {
  const raw = formData.get("editable_keys");
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

async function loadReferenceRow(table: string, recordId?: string) {
  const admin = createAdminClient();

  if (recordId) {
    const { data, error } = await admin.from(table).select("*").eq("id", recordId).maybeSingle<GenericRow>();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return data;
    }
  }

  const { data, error } = await admin.from(table).select("*").limit(1);
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] ?? null) as GenericRow | null;
}

function normalizeValue(input: FormDataEntryValue | null, inputType: string, mode: "create" | "update") {
  if (inputType === "checkbox") {
    return input === "on";
  }

  if (typeof input !== "string") {
    return mode === "update" ? null : undefined;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return mode === "update" ? null : undefined;
  }

  if (inputType === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return trimmed;
}

async function uploadImageIfPresent(formData: FormData) {
  const fileEntry = formData.get("image_file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return null;
  }

  const admin = createAdminClient();
  const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  const path = `admin-uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const { error } = await admin.storage.from(imageBucket).upload(path, fileEntry, {
    cacheControl: "3600",
    contentType: fileEntry.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = admin.storage.from(imageBucket).getPublicUrl(path);
  return data.publicUrl;
}

async function buildPayload(
  slug: string,
  formData: FormData,
  mode: "create" | "update",
  actorProfileId: string,
  recordId?: string,
) {
  const config = getAdminTableConfig(slug);
  if (!config) {
    throw new Error("Unknown admin resource.");
  }

  const admin = createAdminClient();
  const resolvedTable = await resolveTableName(admin, config.table, config.tableAliases);
  const referenceRow = await loadReferenceRow(resolvedTable, recordId);
  const fieldMap = new Map(getEditableFields(config, referenceRow).map((field) => [field.key, field]));
  const editableKeys = parseEditableKeys(formData);
  const payload: Record<string, unknown> = {};

  for (const key of editableKeys) {
    if (key === "image_file" || key === "id" || isTimestampKey(key)) continue;

    const field = fieldMap.get(key);
    const normalized = normalizeValue(formData.get(key), field?.input ?? "text", mode);
    if (normalized !== undefined) {
      payload[key] = normalized;
    }
  }

  if (slug === "images") {
    const uploadedUrl = await uploadImageIfPresent(formData);
    if (uploadedUrl) {
      payload.url = uploadedUrl;
    }
  }

  payload.modified_by_user_id = actorProfileId;
  if (mode === "create") {
    payload.created_by_user_id = actorProfileId;
  }

  return { payload, resolvedTable };
}

function getResourcePath(slug: string) {
  return `/admin/${slug}`;
}

export async function createRecordAction(formData: FormData) {
  const { profile } = await requireSuperadmin();

  const slug = asString(formData.get("table_slug"));
  const config = slug ? getAdminTableConfig(slug) : null;
  if (!slug || !config) {
    throw new Error("Unknown admin resource.");
  }

  if (!config.createEnabled) {
    buildRedirect(getResourcePath(slug), "error", `Create is disabled for ${config.title}.`);
  }

  try {
    const admin = createAdminClient();
    const { payload, resolvedTable } = await buildPayload(slug, formData, "create", String(profile.id));
    const { error } = await admin.from(resolvedTable).insert(payload);
    if (error) {
      buildRedirect(getResourcePath(slug), "error", error.message);
    }

    revalidatePath("/admin");
    revalidatePath(getResourcePath(slug));
    buildRedirect(getResourcePath(slug), "success", `${config.singularLabel} created.`);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }

    buildRedirect(
      getResourcePath(slug),
      "error",
      error instanceof Error ? error.message : `Unable to create ${config.singularLabel}.`,
    );
  }
}

export async function updateRecordAction(formData: FormData) {
  const { profile } = await requireSuperadmin();

  const slug = asString(formData.get("table_slug"));
  const recordId = asString(formData.get("record_id"));
  const config = slug ? getAdminTableConfig(slug) : null;
  if (!slug || !recordId || !config) {
    throw new Error("Unknown admin resource.");
  }

  if (!config.updateEnabled) {
    buildRedirect(getResourcePath(slug), "error", `Update is disabled for ${config.title}.`);
  }

  try {
    const admin = createAdminClient();
    const { payload, resolvedTable } = await buildPayload(slug, formData, "update", String(profile.id), recordId);
    const { error } = await admin.from(resolvedTable).update(payload).eq("id", recordId);
    if (error) {
      buildRedirect(getResourcePath(slug), "error", error.message);
    }

    revalidatePath("/admin");
    revalidatePath(getResourcePath(slug));
    buildRedirect(getResourcePath(slug), "success", `${config.singularLabel} updated.`);
  } catch (error) {
    if (isRedirectLikeError(error)) {
      throw error;
    }

    buildRedirect(
      getResourcePath(slug),
      "error",
      error instanceof Error ? error.message : `Unable to update ${config.singularLabel}.`,
    );
  }
}

export async function deleteRecordAction(formData: FormData) {
  await requireSuperadmin();

  const slug = asString(formData.get("table_slug"));
  const recordId = asString(formData.get("record_id"));
  const config = slug ? getAdminTableConfig(slug) : null;
  if (!slug || !recordId || !config) {
    throw new Error("Unknown admin resource.");
  }

  if (!config.deleteEnabled) {
    buildRedirect(getResourcePath(slug), "error", `Delete is disabled for ${config.title}.`);
  }

  const admin = createAdminClient();
  const resolvedTable = await resolveTableName(admin, config.table, config.tableAliases);
  const { error } = await admin.from(resolvedTable).delete().eq("id", recordId);
  if (error) {
    buildRedirect(getResourcePath(slug), "error", error.message);
  }

  revalidatePath("/admin");
  revalidatePath(getResourcePath(slug));
  buildRedirect(getResourcePath(slug), "success", `${config.singularLabel} deleted.`);
}
