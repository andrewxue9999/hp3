import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { asBoolean, asNumber, asString, getCaptionText, getImageUrl, getRowDate, getRowId, type GenericRow } from "@/lib/admin/data";

export type HumorFlavorRecord = GenericRow & {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  isActive: boolean | null;
};

export type HumorFlavorStepRecord = GenericRow & {
  id: string;
  flavorId: string | null;
  title: string;
  description: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
  stepOrder: number;
  temperature: number | null;
};

export type HumorFlavorImageRecord = {
  id: string;
  url: string | null;
  description: string | null;
  isCommonUse: boolean | null;
};

export type HumorFlavorCaptionRecord = {
  id: string;
  flavorId: string | null;
  text: string | null;
  createdAt: Date | null;
  imageId: string | null;
  imageUrl: string | null;
};

export type HumorFlavorManagerData = {
  flavors: HumorFlavorRecord[];
  steps: HumorFlavorStepRecord[];
  images: HumorFlavorImageRecord[];
  recentCaptions: HumorFlavorCaptionRecord[];
};

const FLAVOR_NAME_KEYS = ["name", "title", "label"];
const FLAVOR_SLUG_KEYS = ["slug", "code", "key"];
const FLAVOR_DESCRIPTION_KEYS = ["description", "summary", "notes"];
const FLAVOR_ACTIVE_KEYS = ["is_active", "is_enabled", "enabled", "active"];
const STEP_FLAVOR_ID_KEYS = ["humor_flavor_id", "flavor_id"];
const STEP_NAME_KEYS = ["name", "title", "label"];
const STEP_DESCRIPTION_KEYS = ["description", "summary", "notes"];
const STEP_ORDER_KEYS = ["step_order", "sort_order", "order_index", "position", "sequence_number", "sequence", "step_number"];
const STEP_SYSTEM_PROMPT_KEYS = ["system_prompt", "prompt"];
const STEP_USER_PROMPT_KEYS = ["user_prompt", "instructions"];
const STEP_TEMPERATURE_KEYS = ["temperature"];
const REQUEST_FLAVOR_ID_KEYS = ["humor_flavor_id", "flavor_id"];
const REQUEST_ID_KEYS = ["id", "caption_request_id"];
const CAPTION_REQUEST_ID_KEYS = ["caption_request_id", "request_id"];
const CAPTION_FLAVOR_ID_KEYS = ["humor_flavor_id", "flavor_id"];
const IMAGE_COMMON_USE_KEYS = ["is_common_use", "common_use", "is_public"];
const IMAGE_DESCRIPTION_KEYS = ["description", "alt_text", "title"];

function pickString(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }

  return null;
}

function pickBoolean(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = asBoolean(row[key]);
    if (value !== null) return value;
  }

  return null;
}

function pickNumber(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }

  return null;
}

function normalizeFlavor(row: GenericRow): HumorFlavorRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  return {
    ...row,
    id,
    name: pickString(row, FLAVOR_NAME_KEYS) ?? `Flavor ${id}`,
    slug: pickString(row, FLAVOR_SLUG_KEYS),
    description: pickString(row, FLAVOR_DESCRIPTION_KEYS),
    isActive: pickBoolean(row, FLAVOR_ACTIVE_KEYS),
  };
}

function normalizeStep(row: GenericRow): HumorFlavorStepRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  const stepOrder = pickNumber(row, STEP_ORDER_KEYS) ?? Number.MAX_SAFE_INTEGER;
  return {
    ...row,
    id,
    flavorId: pickString(row, STEP_FLAVOR_ID_KEYS),
    title: pickString(row, STEP_NAME_KEYS) ?? `Step ${id}`,
    description: pickString(row, STEP_DESCRIPTION_KEYS),
    systemPrompt: pickString(row, STEP_SYSTEM_PROMPT_KEYS),
    userPrompt: pickString(row, STEP_USER_PROMPT_KEYS),
    stepOrder,
    temperature: pickNumber(row, STEP_TEMPERATURE_KEYS),
  };
}

function normalizeImage(row: GenericRow): HumorFlavorImageRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  return {
    id,
    url: getImageUrl(row),
    description: pickString(row, IMAGE_DESCRIPTION_KEYS),
    isCommonUse: pickBoolean(row, IMAGE_COMMON_USE_KEYS),
  };
}

function toCaptionByRequestMap(captionRows: GenericRow[]) {
  const map = new Map<string, GenericRow[]>();

  for (const row of captionRows) {
    const requestId = pickString(row, CAPTION_REQUEST_ID_KEYS);
    if (!requestId) continue;

    const existing = map.get(requestId) ?? [];
    existing.push(row);
    map.set(requestId, existing);
  }

  return map;
}

function normalizeCaption(row: GenericRow, fallbackFlavorId: string | null, imageUrl: string | null): HumorFlavorCaptionRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  return {
    id,
    flavorId: pickString(row, CAPTION_FLAVOR_ID_KEYS) ?? fallbackFlavorId,
    text: getCaptionText(row),
    createdAt: getRowDate(row),
    imageId: pickString(row, ["image_id"]),
    imageUrl,
  };
}

function sortSteps(steps: HumorFlavorStepRecord[]) {
  return [...steps].sort((left, right) => {
    if (left.stepOrder !== right.stepOrder) {
      return left.stepOrder - right.stepOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getFlavorFieldKey(sample: GenericRow | null, candidates: string[], fallback: string) {
  if (sample) {
    for (const key of candidates) {
      if (key in sample) return key;
    }
  }

  return fallback;
}

export function getFlavorOrderField(sample: GenericRow | null) {
  return getFlavorFieldKey(sample, STEP_ORDER_KEYS, "step_order");
}

export function getFlavorForeignKey(sample: GenericRow | null) {
  return getFlavorFieldKey(sample, STEP_FLAVOR_ID_KEYS, "humor_flavor_id");
}

export async function loadHumorFlavorManagerData(): Promise<HumorFlavorManagerData> {
  const admin = createAdminClient();
  const [
    { data: flavorRows = [], error: flavorError },
    { data: stepRows = [], error: stepError },
    { data: imageRows = [], error: imageError },
    { data: captionRequestRows = [], error: requestError },
    { data: captionRows = [], error: captionError },
  ] = await Promise.all([
    admin.from("humor_flavors").select("*").order("id", { ascending: true }),
    admin.from("humor_flavor_steps").select("*").order("id", { ascending: true }),
    admin.from("images").select("*").order("id", { ascending: false }).limit(24),
    admin.from("caption_requests").select("*").order("id", { ascending: false }).limit(60),
    admin.from("captions").select("*").order("id", { ascending: false }).limit(120),
  ]);

  if (flavorError || stepError || imageError || requestError || captionError) {
    throw new Error(
      flavorError?.message ??
        stepError?.message ??
        imageError?.message ??
        requestError?.message ??
        captionError?.message ??
        "Unable to load humor flavor manager.",
    );
  }

  const flavors = (flavorRows as GenericRow[])
    .map(normalizeFlavor)
    .filter((row): row is HumorFlavorRecord => Boolean(row));
  const steps = sortSteps(
    (stepRows as GenericRow[]).map(normalizeStep).filter((row): row is HumorFlavorStepRecord => Boolean(row)),
  );
  const images = (imageRows as GenericRow[])
    .map(normalizeImage)
    .filter((row): row is HumorFlavorImageRecord => Boolean(row))
    .sort((left, right) => Number(right.isCommonUse === true) - Number(left.isCommonUse === true));

  const imageUrlById = new Map(images.map((image) => [image.id, image.url]));
  const requestById = new Map(
    (captionRequestRows as GenericRow[])
      .map((row) => {
        const id = pickString(row, REQUEST_ID_KEYS);
        if (!id) return null;
        return { id, row };
      })
      .filter((item): item is { id: string; row: GenericRow } => Boolean(item))
      .map((item) => [item.id, item.row]),
  );
  const captionsByRequestId = toCaptionByRequestMap(captionRows as GenericRow[]);

  const directCaptions = (captionRows as GenericRow[])
    .map((row) => normalizeCaption(row, null, imageUrlById.get(pickString(row, ["image_id"]) ?? "") ?? null))
    .filter((row): row is HumorFlavorCaptionRecord => Boolean(row))
    .filter((row) => Boolean(row.flavorId));

  const requestDerivedCaptions = [...captionsByRequestId.entries()].flatMap(([requestId, rows]) => {
    const request = requestById.get(requestId);
    const flavorId = request ? pickString(request, REQUEST_FLAVOR_ID_KEYS) : null;
    const imageId = request ? pickString(request, ["image_id"]) : null;
    const imageUrl = imageId ? imageUrlById.get(imageId) ?? null : null;

    return rows
      .map((row) => normalizeCaption(row, flavorId, imageUrl))
      .filter((caption): caption is HumorFlavorCaptionRecord => caption !== null && Boolean(caption.flavorId));
  });

  const uniqueCaptions = new Map<string, HumorFlavorCaptionRecord>();
  for (const caption of [...requestDerivedCaptions, ...directCaptions]) {
    uniqueCaptions.set(caption.id, caption);
  }

  const recentCaptions = [...uniqueCaptions.values()].sort((left, right) => {
    const leftTime = left.createdAt?.getTime() ?? 0;
    const rightTime = right.createdAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  return { flavors, steps, images, recentCaptions };
}

export function getStepsForFlavor(steps: HumorFlavorStepRecord[], flavorId: string) {
  return sortSteps(steps.filter((step) => step.flavorId === flavorId));
}

export function getCaptionsForFlavor(captions: HumorFlavorCaptionRecord[], flavorId: string) {
  return captions.filter((caption) => caption.flavorId === flavorId).slice(0, 12);
}
