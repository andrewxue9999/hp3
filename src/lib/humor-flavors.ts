import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { asBoolean, asNumber, asString, getCaptionText, getImageUrl, getRowDate, getRowId, type GenericRow } from "@/lib/admin/data";

export type HumorFlavorRecord = GenericRow & {
  id: string;
  label: string;
  slug: string | null;
  description: string | null;
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
  inputTypeId: number | null;
  outputTypeId: number | null;
  modelId: number | null;
  stepTypeId: number | null;
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

const REQUEST_ID_KEYS = ["id", "caption_request_id"];
const CAPTION_REQUEST_ID_KEYS = ["caption_request_id", "request_id"];
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

function normalizeFlavor(row: GenericRow): HumorFlavorRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  return {
    ...row,
    id,
    label: asString(row.slug) ?? asString(row.description) ?? `Flavor ${id}`,
    slug: asString(row.slug),
    description: asString(row.description),
  };
}

function normalizeStep(row: GenericRow): HumorFlavorStepRecord | null {
  const id = getRowId(row);
  if (!id) return null;

  const stepOrder = asNumber(row.order_by) ?? Number.MAX_SAFE_INTEGER;
  return {
    ...row,
    id,
    flavorId: asString(row.humor_flavor_id),
    title: asString(row.description) ?? `Step ${id}`,
    description: asString(row.description),
    systemPrompt: asString(row.llm_system_prompt),
    userPrompt: asString(row.llm_user_prompt),
    stepOrder,
    temperature: asNumber(row.llm_temperature),
    inputTypeId: asNumber(row.llm_input_type_id),
    outputTypeId: asNumber(row.llm_output_type_id),
    modelId: asNumber(row.llm_model_id),
    stepTypeId: asNumber(row.humor_flavor_step_type_id),
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
    flavorId: asString(row.humor_flavor_id) ?? fallbackFlavorId,
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

export function getFlavorOrderField() {
  return "order_by";
}

export function getFlavorForeignKey() {
  return "humor_flavor_id";
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
    const flavorId = request ? asString(request.humor_flavor_id) : null;
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
