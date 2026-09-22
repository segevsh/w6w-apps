import type { Param } from "@w6w/types";

/**
 * Shared parameter definitions for the SEMrush Standard API.
 *
 * The v4 API's query parameters are snake_case on the wire and the pack keeps
 * the vendor's own spelling for these, so a param key is the wire name and the
 * mapping in each Action's `query` object is a plain 1:1.
 *
 * `scope` is the one parameter that differs per family: the backlink report
 * endpoints accept all four targets, while the historical summary, comparison
 * and matrix endpoints accept three (no `SUBFOLDER`). Rather than a union that
 * a wrong Action could quietly pick from, each family gets its own list.
 */

/** The four targets the backlink *report* endpoints accept. */
export const SCOPE_FULL = ["ROOT_DOMAIN", "SUBDOMAIN", "SUBFOLDER", "PAGE"] as const;

/** The three targets the summary/comparison/matrix endpoints accept — no `SUBFOLDER`. */
export const SCOPE_NO_SUBFOLDER = ["ROOT_DOMAIN", "SUBDOMAIN", "PAGE"] as const;

const SCOPE_LABELS: Record<string, string> = {
  ROOT_DOMAIN: "Root domain — example.com and every subdomain of it",
  SUBDOMAIN: "Subdomain — blog.example.com only",
  SUBFOLDER: "Subfolder — example.com/blog/ only",
  PAGE: "Page — one exact URL",
};

/**
 * `scope` — which part of the target the report is about.
 *
 * Required on every endpoint that takes it, and with no default on purpose:
 * `ROOT_DOMAIN` and `PAGE` describe different datasets, and guessing one would
 * silently answer a question the caller did not ask.
 */
export function scopeParam(values: readonly string[]): Param {
  return {
    key: "scope",
    label: "Scope",
    type: "select",
    required: true,
    options: values.map((value) => ({ value, label: SCOPE_LABELS[value] ?? value })),
    hint: "Which part of the target the report covers. Required — the vendor applies no default.",
  };
}

/**
 * `fields` — narrow the response to named columns.
 *
 * Comma-joined on the wire. Omitting it returns the vendor's full row, which is
 * why the hint says there is no penalty for leaving it empty.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "array",
  item: { type: "string", placeholder: "anchor" },
  advanced: true,
  hint: "Column names to return, in the vendor's own spelling. Empty = every column " +
    "the report has.",
};

/**
 * `limit` — rows to return.
 *
 * The vendor's defaults are large (100 for the backlink lists, and it stops
 * there), so every Action prefills the same 100 rather than leaving it unset.
 */
export function limitParam(defaultValue: number, hint?: string): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    default: defaultValue,
    validation: { integer: true, min: 1 },
    hint: hint ?? `Rows to return. Defaults to ${defaultValue}, the vendor's own default.`,
  };
}

/** `offset` — rows to skip. Present for paging the backlink lists. */
export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Rows to skip, for paging. The vendor applies no default.",
};

/** `direction` — sort order. */
export const directionParam: Param = {
  key: "direction",
  label: "Direction",
  type: "select",
  default: "DESC",
  options: [
    { value: "DESC", label: "Descending" },
    { value: "ASC", label: "Ascending" },
  ],
  hint: "Sort direction for `order_by`. Defaults to descending.",
};

/**
 * `order_by` — the column to sort by.
 *
 * Free text rather than an enum: the documented default is named for the
 * endpoint (and named below), but the sortable set is the report's own columns
 * and differs per endpoint, so a closed list here would silently drop a legal
 * value.
 */
export function orderByParam(defaultValue?: string, hint?: string): Param {
  const fallback = defaultValue
    ? `Column to sort by, in the vendor's own spelling. Defaults to \`${defaultValue}\`.`
    : "Column to sort by, in the vendor's own spelling. The vendor applies its own default " +
      "when this is empty.";
  return {
    key: "order_by",
    label: "Order by",
    type: "string",
    ...(defaultValue ? { default: defaultValue } : {}),
    hint: hint ?? fallback,
  };
}

/**
 * `filter` — the vendor's own filter expression.
 *
 * Passed through verbatim: the expression grammar is SEMrush's, and rewriting
 * or validating it here would reject expressions the API accepts.
 */
export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "string",
  advanced: true,
  placeholder: "anchor=example",
  hint: "A SEMrush filter expression, passed through exactly as written.",
};
