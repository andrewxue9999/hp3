import "server-only";

import { asBoolean, asNumber, asString, type GenericRow } from "@/lib/admin/data";

export type AdminFieldInput = "text" | "textarea" | "checkbox" | "number" | "url" | "email";

export type AdminFieldConfig = {
  key: string;
  label?: string;
  input?: AdminFieldInput;
};

export type AdminTableConfig = {
  slug: string;
  table: string;
  tableAliases?: string[];
  title: string;
  eyebrow: string;
  description: string;
  singularLabel: string;
  createEnabled: boolean;
  updateEnabled: boolean;
  deleteEnabled: boolean;
  searchKeys?: string[];
  orderBy?: string;
  fieldOrder?: string[];
  fieldOverrides?: Record<string, AdminFieldConfig>;
};

const baseFieldOverrides: Record<string, AdminFieldConfig> = {
  id: { key: "id", label: "ID", input: "text" },
  url: { key: "url", label: "URL", input: "url" },
  image_url: { key: "image_url", label: "Image URL", input: "url" },
  cdn_url: { key: "cdn_url", label: "CDN URL", input: "url" },
  email: { key: "email", label: "Email", input: "email" },
  domain: { key: "domain", label: "Domain", input: "text" },
  description: { key: "description", label: "Description", input: "textarea" },
  content: { key: "content", label: "Content", input: "textarea" },
  caption: { key: "caption", label: "Caption", input: "textarea" },
  text: { key: "text", label: "Text", input: "textarea" },
  prompt: { key: "prompt", label: "Prompt", input: "textarea" },
  response: { key: "response", label: "Response", input: "textarea" },
  system_prompt: { key: "system_prompt", label: "System Prompt", input: "textarea" },
  user_prompt: { key: "user_prompt", label: "User Prompt", input: "textarea" },
  is_common_use: { key: "is_common_use", label: "Common Use", input: "checkbox" },
  is_active: { key: "is_active", label: "Active", input: "checkbox" },
  is_enabled: { key: "is_enabled", label: "Enabled", input: "checkbox" },
  is_default: { key: "is_default", label: "Default", input: "checkbox" },
  disabled: { key: "disabled", label: "Disabled", input: "checkbox" },
  temperature: { key: "temperature", label: "Temperature", input: "number" },
  caption_count: { key: "caption_count", label: "Caption Count", input: "number" },
  weight: { key: "weight", label: "Weight", input: "number" },
  step_order: { key: "step_order", label: "Step Order", input: "number" },
  sort_order: { key: "sort_order", label: "Sort Order", input: "number" },
};

export const adminTableConfigs: AdminTableConfig[] = [
  {
    slug: "users",
    table: "profiles",
    title: "Users",
    eyebrow: "Profiles",
    description: "Read users from the profiles table, including account metadata and superadmin state.",
    singularLabel: "user",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["email", "display_name", "username", "full_name"],
    orderBy: "id",
  },
  {
    slug: "images",
    table: "images",
    title: "Images",
    eyebrow: "Image CRUD",
    description: "Create, inspect, update, delete, and upload new images into the admin inventory.",
    singularLabel: "image",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["description", "url", "user_id"],
    orderBy: "id",
    fieldOrder: ["url", "description", "is_common_use", "user_id"],
  },
  {
    slug: "humor-flavors",
    table: "humor_flavors",
    title: "Humor Flavors",
    eyebrow: "Pipeline Config",
    description: "Read humor flavors and inspect the prompt-chain steps associated with each flavor.",
    singularLabel: "humor flavor",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["name", "description", "slug"],
    orderBy: "id",
  },
  {
    slug: "humor-flavor-steps",
    table: "humor_flavor_steps",
    title: "Humor Flavor Steps",
    eyebrow: "Prompt Chain",
    description: "Read the ordered steps that define each humor flavor's prompt chain.",
    singularLabel: "humor flavor step",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["name", "description", "system_prompt", "user_prompt"],
    orderBy: "id",
  },
  {
    slug: "humor-mix",
    table: "humor_flavor_mix",
    title: "Humor Mix",
    eyebrow: "Live Mix",
    description: "Review and update the active humor flavor mix that controls generation split and caption counts.",
    singularLabel: "humor mix row",
    createEnabled: false,
    updateEnabled: true,
    deleteEnabled: false,
    searchKeys: ["name", "description"],
    orderBy: "id",
  },
  {
    slug: "terms",
    table: "terms",
    title: "Terms",
    eyebrow: "Term CRUD",
    description: "Create, inspect, update, and delete terms used across the humor pipeline.",
    singularLabel: "term",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["term", "name", "value", "description"],
    orderBy: "id",
    fieldOrder: ["term", "name", "value", "description", "is_active"],
  },
  {
    slug: "captions",
    table: "captions",
    title: "Captions",
    eyebrow: "Caption Archive",
    description: "Read caption records with their current raw row data.",
    singularLabel: "caption",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["content", "caption", "text"],
    orderBy: "id",
  },
  {
    slug: "caption-requests",
    table: "caption_requests",
    title: "Caption Requests",
    eyebrow: "Generation Jobs",
    description: "Read caption request rows to inspect generation job lifecycle and ownership.",
    singularLabel: "caption request",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["status", "error_message"],
    orderBy: "id",
  },
  {
    slug: "caption-examples",
    table: "caption_examples",
    title: "Caption Examples",
    eyebrow: "Example CRUD",
    description: "Create, inspect, update, and delete caption examples used for prompting or review.",
    singularLabel: "caption example",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["content", "caption", "text", "description"],
    orderBy: "id",
    fieldOrder: ["content", "caption", "text", "description"],
  },
  {
    slug: "llm-models",
    table: "llm_models",
    title: "LLM Models",
    eyebrow: "Model CRUD",
    description: "Create, inspect, update, and delete LLM models referenced by the pipeline.",
    singularLabel: "llm model",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["name", "model", "model_name", "description"],
    orderBy: "id",
    fieldOrder: ["name", "model", "model_name", "description", "provider_id", "is_active"],
  },
  {
    slug: "llm-providers",
    table: "llm_providers",
    title: "LLM Providers",
    eyebrow: "Provider CRUD",
    description: "Create, inspect, update, and delete provider records for model routing.",
    singularLabel: "llm provider",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["name", "provider", "description", "base_url"],
    orderBy: "id",
    fieldOrder: ["name", "provider", "description", "base_url", "is_active"],
  },
  {
    slug: "llm-prompt-chains",
    table: "llm_prompt_chains",
    title: "LLM Prompt Chains",
    eyebrow: "Audit Trail",
    description: "Read prompt-chain groups that tie multi-step LLM executions together.",
    singularLabel: "llm prompt chain",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["name", "description", "status"],
    orderBy: "id",
  },
  {
    slug: "llm-responses",
    table: "llm_model_responses",
    title: "LLM Responses",
    eyebrow: "Audit Trail",
    description: "Read raw LLM prompt/response records for debugging generation output.",
    singularLabel: "llm response",
    createEnabled: false,
    updateEnabled: false,
    deleteEnabled: false,
    searchKeys: ["prompt", "response", "error_message"],
    orderBy: "id",
  },
  {
    slug: "allowed-signup-domains",
    table: "allowed_signup_domains",
    title: "Allowed Signup Domains",
    eyebrow: "Domain Allowlist",
    description: "Create, inspect, update, and delete the allowed signup domain list.",
    singularLabel: "allowed signup domain",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["domain", "description"],
    orderBy: "id",
    fieldOrder: ["domain", "description", "is_active"],
  },
  {
    slug: "whitelisted-emails",
    table: "whitelisted_emails",
    tableAliases: ["whitelisted_email_addresses", "whitelisted_email_address", "whitelist_email_addresses"],
    title: "Whitelisted E-mail Addresses",
    eyebrow: "Email Allowlist",
    description: "Create, inspect, update, and delete whitelisted e-mail addresses.",
    singularLabel: "whitelisted e-mail",
    createEnabled: true,
    updateEnabled: true,
    deleteEnabled: true,
    searchKeys: ["email", "description"],
    orderBy: "id",
    fieldOrder: ["email", "description", "is_active"],
  },
];

const configMap = new Map(adminTableConfigs.map((config) => [config.slug, config]));

export function getAdminTableConfig(slug: string) {
  return configMap.get(slug) ?? null;
}

export function isTimestampKey(key: string) {
  return (
    key === "created_datetime_utc" ||
    key === "modified_datetime_utc" ||
    key === "created_at_utc" ||
    key === "modified_at_utc" ||
    key === "created_at" ||
    key === "updated_at"
  );
}

export function canEditKey(key: string) {
  return key !== "id" && !isTimestampKey(key);
}

function inferInputFromValue(key: string, value: unknown): AdminFieldInput {
  if (baseFieldOverrides[key]?.input) {
    return baseFieldOverrides[key].input!;
  }

  if (typeof value === "boolean") {
    return "checkbox";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "string") {
    if (key.includes("email")) return "email";
    if (key.includes("url")) return "url";
    if (value.length > 120 || value.includes("\n")) return "textarea";
  }

  return "text";
}

function toLabel(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getEditableFields(config: AdminTableConfig, referenceRow: GenericRow | null) {
  const discoveredKeys = referenceRow ? Object.keys(referenceRow).filter((key) => canEditKey(key)) : [];
  const orderedKeys = [
    ...(config.fieldOrder ?? []),
    ...discoveredKeys.filter((key) => !(config.fieldOrder ?? []).includes(key)),
  ];
  const keys = orderedKeys.length > 0 ? orderedKeys : config.fieldOrder ?? [];

  return keys.map((key) => {
    const override = config.fieldOverrides?.[key] ?? baseFieldOverrides[key];
    const currentValue = referenceRow?.[key];

    return {
      key,
      label: override?.label ?? toLabel(key),
      input: override?.input ?? inferInputFromValue(key, currentValue),
    };
  });
}

export function matchesRowQuery(row: GenericRow, query: string, searchKeys?: string[]) {
  if (!query) return true;

  const keys = searchKeys && searchKeys.length > 0 ? searchKeys : Object.keys(row);
  const haystack = keys
    .map((key) => {
      const value = row[key];
      return asString(value) ?? (typeof value === "boolean" ? String(value) : null);
    })
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function summarizeRow(row: GenericRow, config: AdminTableConfig) {
  const candidates = config.searchKeys ?? [
    "name",
    "title",
    "term",
    "email",
    "domain",
    "description",
    "content",
    "caption",
    "text",
    "status",
  ];

  for (const key of candidates) {
    const value = row[key];
    const text = asString(value);
    if (text) return text;
  }

  const firstString = Object.values(row).find((value) => asString(value));
  if (firstString) {
    return asString(firstString);
  }

  const firstNumber = Object.values(row).find((value) => asNumber(value) !== null);
  if (firstNumber !== undefined) {
    return String(asNumber(firstNumber));
  }

  const firstBoolean = Object.values(row).find((value) => asBoolean(value) !== null);
  if (firstBoolean !== undefined) {
    return String(asBoolean(firstBoolean));
  }

  return null;
}
