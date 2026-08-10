/**
 * Shared param fragments and output shapes.
 *
 * Every parameter name, enum value and description here is transcribed from
 * Kajabi's generated OpenAPI document
 * (<https://raw.githubusercontent.com/Kajabi/public_api_docs/main/openapi.yaml>,
 * `openapi: 3.1.1`, `info.version: 1.1.0`, fetched 2026-08-03). Where a hint
 * quotes the vendor it is the document's own wording, not a paraphrase.
 */
import type { OutputField, Param } from "@w6w/types";

// ------------------------------------------------------------------ params --

/**
 * JSON:API pagination. Uniform across every list endpoint in this API.
 *
 * The document declares `page[number]` and `page[size]` on each collection but
 * publishes **no default page size and no maximum**. So neither param carries a
 * default here: inventing one would silently cap a listing at a number this app
 * chose, and restating a server default this app cannot actually see would be
 * worse — it would look authoritative while being a guess.
 */
export const pageNumberParam: Param = {
  key: "pageNumber",
  label: "Page",
  type: "number",
  hint: "1-based. Sent as `page[number]`.",
  validation: { integer: true, min: 1 },
};

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  hint: "Sent as `page[size]`. Kajabi documents no default and no maximum; the response's " +
    "`links.next` is the reliable way to know whether more pages exist.",
  validation: { integer: true, min: 1 },
};

/**
 * `filter[site_id]` — the tenant selector, and the one parameter most likely to
 * be the reason a workflow returns nothing.
 *
 * Kajabi's own words, on nearly every collection in the document: "It is
 * recommended to always filter by site_id, for example ?filter[site_id]=111.
 * This param is required when the account has multiple sites."
 *
 * It is declared `required: false` in the schema, which is why this app cannot
 * make it required either — a single-site account works fine without it, and
 * forcing it would mean every workflow had to look up an id it does not need.
 * But the failure mode on a multi-site account is not a helpful 400; it is
 * ambiguity. So the hint states the rule in the vendor's own terms and points
 * at the action that returns the id.
 *
 * This is also the reason the app's `network.allow` can stay a single literal
 * host: on this API the tenant travels as a query parameter, not as a
 * per-tenant hostname. Compare `wordpress` and `grist`, which must wildcard.
 */
export const siteFilterParam: Param = {
  key: "siteId",
  label: "Site ID",
  type: "string",
  hint: 'Sent as `filter[site_id]`. Kajabi: *"required when the account has multiple sites"* — ' +
    "optional on a single-site account, and on a multi-site account results are ambiguous " +
    "without it. `site-list` returns the ids.",
};

/** `sort` — a JSON:API sort key, `-` prefixed for descending. */
export function sortParam(fields: string): Param {
  return {
    key: "sort",
    label: "Sort by",
    type: "string",
    hint: `One of: ${fields}. Prefix with \`-\` for descending, e.g. \`-created_at\`.`,
  };
}

/**
 * `fields[<type>]` — JSON:API sparse fieldsets.
 *
 * Worth exposing rather than hiding: these responses are wide (a contact
 * carries address, subscription, revenue and custom-field attributes), and a
 * workflow that needs a name and an email should be able to say so. Omitted
 * means "all attributes", which is Kajabi's behaviour, not a default this app
 * applies.
 */
export function fieldsParam(type: string, examples: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "string",
    advanced: true,
    hint: `Comma-separated sparse fieldset, sent as \`fields[${type}]\`. e.g. \`${examples}\`. ` +
      "Leave blank for every attribute.",
  };
}

/** `include` — JSON:API compound documents, returned under `included`. */
export function includeParam(hint: string): Param {
  return {
    key: "include",
    label: "Include",
    type: "string",
    advanced: true,
    hint: `Comma-separated related resources to side-load into \`included\`. ${hint}`,
  };
}

/**
 * The escape hatch for the long tail of documented filters.
 *
 * See `extraFilters` in `lib/client.ts` for why this exists: the contact and
 * customer collections declare 75+ `filter[…]` parameters each, and neither
 * rendering all of them nor picking a favourite dozen is a good answer.
 */
export function extraFiltersParam(docHint: string): Param {
  return {
    key: "filters",
    label: "Additional filters",
    type: "string",
    ui: "textarea",
    advanced: true,
    placeholder: '{"has_tag_id": "123", "subscribed": true}',
    hint: `JSON object of any other documented Kajabi filter, without the \`filter[…]\` ` +
      `wrapper — \`{"created_in_last": 30}\` becomes \`filter[created_in_last]=30\`. ${docHint}`,
  };
}

/** The resource id in a path. String, because JSON:API ids are strings. */
export function idParam(label: string, hint?: string): Param {
  return { key: "id", label, type: "string", required: true, hint };
}

/**
 * A comma-separated id list destined for a JSON:API relationship array.
 *
 * The relationship routes take an array of `{ id, type }` even for one member,
 * so batching is the API's own shape — see `identifierList` in `lib/client.ts`.
 */
export function idListParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", required: true, hint };
}

// ----------------------------------------------------------------- outputs --

/**
 * A JSON:API single-resource document: `{ data: { id, type, attributes }, … }`.
 *
 * Declared once because it is genuinely uniform here — every read endpoint in
 * this API returns this envelope, with the resource's own fields nested under
 * `data.attributes` rather than hoisted to the top level. Workflow authors
 * reaching for `{{step.email}}` instead of `{{step.data.attributes.email}}` is
 * the predictable mistake, and an accurate output declaration is what prevents
 * it.
 */
export const resourceOutput: OutputField[] = [
  { key: "data", type: "object", label: "Resource" },
  { key: "data.id", type: "string", label: "ID" },
  { key: "data.type", type: "string", label: "Type" },
  { key: "data.attributes", type: "object", label: "Attributes" },
  { key: "data.relationships", type: "object", label: "Relationships" },
  { key: "included", type: "array", label: "Side-loaded resources" },
];

/** A JSON:API collection document: `{ data: [...], meta, links }`. */
export const collectionOutput: OutputField[] = [
  { key: "data", type: "array", label: "Resources" },
  { key: "included", type: "array", label: "Side-loaded resources" },
  { key: "meta", type: "object", label: "Metadata" },
  { key: "links", type: "object", label: "Pagination links" },
  { key: "links.next", type: "string", label: "Next page URL" },
];

/**
 * A relationship document: `{ data: [{ id, type }, …] }`.
 *
 * The relationship routes return identifiers only — no attributes — so a
 * workflow that needs the tag's name must follow up with `tag-list`. Declaring
 * the thin shape honestly is better than implying attributes that are not there.
 */
export const relationshipOutput: OutputField[] = [
  { key: "data", type: "array", label: "Resource identifiers" },
];
