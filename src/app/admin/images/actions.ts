"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/admin/auth";
import type { GenericRow } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_IMAGE_FIELDS = ["url", "description", "is_common_use", "user_id"];
const BOOLEAN_FIELDS = new Set(["is_common_use"]);
const TIMESTAMP_FIELDS = {
  created: ["created_datetime_utc", "created_at_utc", "created_at"],
  modified: ["modified_datetime_utc", "modified_at_utc", "updated_at"],
};

async function loadReferenceImage() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("images").select("*").limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] ?? null) as GenericRow | null;
}

function buildPayload(formData: FormData, reference: GenericRow | null, mode: "create" | "update") {
  const payload: Record<string, unknown> = {};
  const keys = reference ? new Set(Object.keys(reference)) : new Set(DEFAULT_IMAGE_FIELDS);

  for (const field of DEFAULT_IMAGE_FIELDS) {
    if (!keys.has(field)) continue;

    if (BOOLEAN_FIELDS.has(field)) {
      payload[field] = formData.get(field) === "on";
      continue;
    }

    const value = formData.get(field);
    if (typeof value !== "string") continue;
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      if (mode === "update") {
        payload[field] = null;
      }
      continue;
    }

    payload[field] = trimmed;
  }

  const now = new Date().toISOString();
  if (reference) {
    for (const key of TIMESTAMP_FIELDS.modified) {
      if (key in reference) {
        payload[key] = now;
      }
    }

    if (mode === "create") {
      for (const key of TIMESTAMP_FIELDS.created) {
        if (key in reference) {
          payload[key] = now;
        }
      }
    }
  }

  return payload;
}

function toRedirect(path: string, status: string, message: string) {
  const params = new URLSearchParams({
    status,
    message,
  });

  redirect(`${path}?${params.toString()}`);
}

export async function createImageAction(formData: FormData) {
  await requireSuperadmin();

  const admin = createAdminClient();
  const reference = await loadReferenceImage();
  const payload = buildPayload(formData, reference, "create");

  const { error } = await admin.from("images").insert(payload);
  if (error) {
    toRedirect("/admin/images", "error", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  toRedirect("/admin/images", "success", "Image created.");
}

export async function updateImageAction(formData: FormData) {
  await requireSuperadmin();

  const imageId = formData.get("image_id");
  if (typeof imageId !== "string" || imageId.trim().length === 0) {
    toRedirect("/admin/images", "error", "Missing image id.");
  }

  const admin = createAdminClient();
  const { data: currentImage, error: currentError } = await admin
    .from("images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle<GenericRow>();

  if (currentError) {
    toRedirect("/admin/images", "error", currentError.message);
  }

  const payload = buildPayload(formData, currentImage, "update");
  const { error } = await admin.from("images").update(payload).eq("id", imageId);
  if (error) {
    toRedirect("/admin/images", "error", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  toRedirect("/admin/images", "success", "Image updated.");
}

export async function deleteImageAction(formData: FormData) {
  await requireSuperadmin();

  const imageId = formData.get("image_id");
  if (typeof imageId !== "string" || imageId.trim().length === 0) {
    toRedirect("/admin/images", "error", "Missing image id.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("images").delete().eq("id", imageId);
  if (error) {
    toRedirect("/admin/images", "error", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/images");
  toRedirect("/admin/images", "success", "Image deleted.");
}
