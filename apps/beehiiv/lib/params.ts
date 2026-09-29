import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the beehiiv actions.
 *
 * Every field and enum here is copied from beehiiv's own OpenAPI 3.0.1
 * document (`beehiiv - OpenAPI Specification.yaml`), not inferred.
 */

/** Every path in this API is nested under a publication. No auth scoping exists otherwise. */
export const publicationIdParam: Param = {
  key: "publicationId",
  label: "Publication",
  type: "string",
  required: true,
  placeholder: "pub_00000000-0000-0000-0000-000000000000",
  hint: "The prefixed publication ID. Use the List Publications action to find it.",
};

/**
 * The offset `limit`/`page` pair used by every list endpoint (subscriptions also
 * accepts a `cursor` instead — see {@link cursorParam}).
 *
 * The vendor's own default is `limit=10`. That is kept here (rather than
 * overridden the way Apify's 1,000-row default is) because 10 is already a
 * conservative, workflow-friendly default.
 */
export function offsetPaginationParams(hint?: string): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: hint ?? "Between 1 and 100. Defaults to 10.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-indexed page number. Defaults to 1.",
    },
  ];
}

/**
 * `GET /subscriptions` only. The vendor's own spec deprecates offset pagination
 * (`page`) on this one endpoint and caps it at 100 pages; pass the `next_cursor`
 * from a previous page's response here to page past that ceiling.
 */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Opaque token from a previous page's `next_cursor`. When set, this takes priority over " +
    "`page` and pages have no 100-page ceiling — prefer this for a list that may run long.",
};

export const directionParam: Param = {
  key: "direction",
  label: "Sort direction",
  type: "select",
  options: [
    { value: "asc", label: "Ascending (default)" },
    { value: "desc", label: "Descending" },
  ],
};

/**
 * A comma-separated `expand[]` filter. Left as free text rather than a fixed
 * `multiselect` because the valid values differ per endpoint (documented in
 * each action's own hint) and several endpoints share this exact field name.
 */
export function expandParam(hint: string): Param {
  return {
    key: "expand",
    label: "Expand",
    type: "string",
    hint,
  };
}

export const postIdParam: Param = {
  key: "postId",
  label: "Post",
  type: "string",
  required: true,
  placeholder: "post_00000000-0000-0000-0000-000000000000",
};

export const subscriptionIdParam: Param = {
  key: "subscriptionId",
  label: "Subscription",
  type: "string",
  required: true,
  placeholder: "sub_00000000-0000-0000-0000-000000000000",
};

export const segmentIdParam: Param = {
  key: "segmentId",
  label: "Segment",
  type: "string",
  required: true,
  placeholder: "seg_00000000-0000-0000-0000-000000000000",
};

/** Build the repeated-key `expand[]`/`content_tags[]`-style query entries beehiiv expects. */
export function bracketQuery(
  key: string,
  values: string[] | undefined,
): Record<string, string[] | undefined> {
  return values && values.length > 0 ? { [`${key}[]`]: values } : {};
}
