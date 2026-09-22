import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the GIPHY actions.
 *
 * Every enum here is copied from GIPHY's own documentation
 * (`developers.giphy.com/docs/api/endpoint/`, verified 2026-09-22), not
 * inferred. Where the documentation states a ceiling, the ceiling is stated at
 * the call site rather than averaged into one wrong number here.
 */

/**
 * The `rating` filter's four documented values.
 *
 * GIPHY describes them as an MPAA-style content filter. The labels are the
 * rating names only — the documentation does not state which rating applies
 * when the parameter is omitted, so nothing here claims a default.
 */
export const ratingOptions = [
  { value: "g", label: "G — general audiences" },
  { value: "pg", label: "PG — parental guidance suggested" },
  { value: "pg-13", label: "PG-13 — parents strongly cautioned" },
  { value: "r", label: "R — restricted" },
];

/**
 * Shared by every endpoint that accepts the filter. Optional everywhere:
 * unset means GIPHY applies its own default rather than this app inventing one.
 */
export const ratingParam: Param = {
  key: "rating",
  label: "Rating",
  type: "select",
  options: ratingOptions,
  hint: "Filters results by the content rating GIPHY assigns. Left unset, GIPHY applies its own " +
    "default.",
};

/**
 * `limit`/`offset` for the list endpoints.
 *
 * `limit` is prefilled with GIPHY's documented default of 25 where the
 * documentation states one (the two search endpoints), and left unset where it
 * does not, so the vendor's own default applies instead of a guessed number.
 * Beta keys are capped at 50 — that is stated in the hint rather than enforced,
 * because a production key is not.
 */
export function limitParam(defaultLimit?: number): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    ...(defaultLimit === undefined ? {} : { default: defaultLimit }),
    validation: { integer: true, min: 1 },
    hint: defaultLimit === undefined
      ? "Number of results to return. Left unset, GIPHY's own default applies."
      : `Number of results to return. GIPHY's documented default is ${defaultLimit}, and beta keys ` +
        "are capped at 50.",
  };
}

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Number of results to skip from the start. Left unset, GIPHY starts at 0. Raise it with " +
    "`limit` to page through a result set.",
};

/**
 * `weirdness` on the translate endpoints.
 *
 * GIPHY documents the parameter but not a range, so no bounds are enforced
 * here — the hint says what the vendor says it does and nothing more.
 */
export const weirdnessParam: Param = {
  key: "weirdness",
  label: "Weirdness",
  type: "number",
  advanced: true,
  hint: "How hard GIPHY tries to surprise you. The higher the value, the stranger the translation.",
};

/**
 * The `GifObject` fields this app exposes, flattened onto either `data` (the
 * single-object endpoints) or `data[]` (the list endpoints).
 *
 * A deliberate subset of GIPHY's schema, not a typed mirror: identity
 * (`id`/`slug`), the two URLs a workflow actually uses (the `giphy.com` page
 * and the embed URL), the content `rating`, the optional `title`, and the one
 * rendition worth defaulting to — `images.original`.
 *
 * `images.original.width`/`height` are declared `string` because that is what
 * GIPHY serves — the schema documents them as strings even though they read as
 * numbers, and coercing them would change what the API said.
 */
export function gifFields(prefix: string): OutputField[] {
  return [
    { key: `${prefix}.id`, type: "string", label: "GIF ID" },
    { key: `${prefix}.slug`, type: "string", label: "Slug" },
    { key: `${prefix}.url`, type: "string", label: "GIPHY page URL" },
    { key: `${prefix}.embed_url`, type: "string", label: "Embed URL" },
    { key: `${prefix}.rating`, type: "string", label: "Content rating" },
    { key: `${prefix}.title`, type: "string", label: "Title (absent on some objects)" },
    { key: `${prefix}.images.original.url`, type: "string", label: "Original image URL" },
    { key: `${prefix}.images.original.width`, type: "string", label: "Original width, in pixels" },
    {
      key: `${prefix}.images.original.height`,
      type: "string",
      label: "Original height, in pixels",
    },
  ];
}

/** The output fields the two search actions also return, beyond the GIFs. */
export function paginationField(): OutputField {
  return {
    key: "pagination",
    type: "object",
    label: "Pagination — passed through as GIPHY sends it",
  };
}
