import "server-only";

export type GenericRow = Record<string, unknown>;

const DATE_KEYS = [
  "created_datetime_utc",
  "modified_datetime_utc",
  "created_at_utc",
  "modified_at_utc",
  "created_at",
  "updated_at",
];

export function asString(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return null;
}

export function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function asBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "1", "yes"].includes(normalized)) return true;
    if (["false", "f", "0", "no"].includes(normalized)) return false;
  }

  return null;
}

export function pickFirstString(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }

  return null;
}

export function pickFirstNumber(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }

  return null;
}

export function getRowId(row: GenericRow) {
  return pickFirstString(row, ["id", "caption_id", "image_id", "profile_id"]);
}

export function getRowDate(row: GenericRow) {
  const raw = pickFirstString(row, DATE_KEYS);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getImageUrl(row: GenericRow) {
  return pickFirstString(row, ["url", "image_url", "cdn_url"]);
}

export function getCaptionText(row: GenericRow) {
  return pickFirstString(row, ["content", "caption", "text"]);
}

export function getProfileName(row: GenericRow) {
  return (
    pickFirstString(row, ["display_name", "username", "full_name", "name", "email"]) ?? "Unknown profile"
  );
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(value: Date | null) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDateOnly(value: Date | null) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

export function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
