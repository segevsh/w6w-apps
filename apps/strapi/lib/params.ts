import type { Param } from "@w6w/types";

/**
 * The content type's plural API ID, e.g. `articles` — set in the Content-Type
 * Builder and used verbatim as the `/api/<collection>` path segment. This app
 * is collection-agnostic (same model as `supabase`'s table-agnostic actions):
 * it never hardcodes a content type, so every entry action collects this.
 */
export const collectionParam: Param = {
  key: "collection",
  label: "Content type (plural API ID)",
  type: "string",
  required: true,
  placeholder: "articles",
  hint: "The plural API ID from Strapi's Content-Type Builder, used as `/api/<collection>`.",
};

/**
 * The entry identifier. Strapi v5 addresses entries by `documentId` (a string);
 * v4 and earlier address them by the numeric `id`. Either works unchanged here
 * — the action passes whatever is given straight through as the path segment,
 * so it works against both without the app needing to know which version a
 * given instance runs.
 */
export const idParam: Param = {
  key: "id",
  label: "Entry ID",
  type: "string",
  required: true,
  hint: "Strapi v5: the entry's `documentId`. Strapi v4 and earlier: the numeric `id`.",
};

export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  advanced: true,
  hint: "Comma-separated field names to include (does not apply to relations/media/components).",
};

export const populateParam: Param = {
  key: "populate",
  label: "Populate",
  type: "json",
  advanced: true,
  hint: 'Relations/media/components to include. `"*"` for one level deep, or an object for ' +
    'nested/filtered population, e.g. `{"author": {"fields": ["name"]}}`.',
};

export const statusParam: Param = {
  key: "status",
  label: "Status",
  type: "select",
  advanced: true,
  options: [
    { value: "published", label: "Published (default)" },
    { value: "draft", label: "Draft" },
  ],
  hint: "Draft & Publish only. Omit for content types that don't have it enabled.",
};
