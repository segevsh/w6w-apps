import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Fillout actions.
 *
 * Every enum, bound and default here is copied from Fillout's own OpenAPI
 * fragments (fetched 2026-08-11 from `fillout.com/help/api-reference/*.md`),
 * not inferred.
 */

/**
 * `formId` — the *public* identifier of a form.
 *
 * Fillout calls it "public" because it is the same opaque id that appears in
 * the form's share link (`forms.fillout.com/t/<formId>`), not an internal
 * numeric key. `GET /forms` is the way to list them.
 */
export const formIdParam: Param = {
  key: "formId",
  label: "Form",
  type: "string",
  required: true,
  hint: "The form's public ID — the `formId` field of Get Forms, which is also the last path " +
    "segment of the form's share link.",
};

/** `submissionId` — the id returned as `submissionId` by the submission endpoints. */
export const submissionIdParam: Param = {
  key: "submissionId",
  label: "Submission ID",
  type: "string",
  required: true,
  hint: "The `submissionId` field of a Get Submissions row, or of a webhook payload.",
};

/**
 * `includeEditLink` — shared by Get Submissions and Get Submission.
 *
 * The link it adds lets its holder edit the respondent's answers without
 * authenticating, so it is off by default and says so rather than being a
 * quietly-enabled convenience.
 */
export const includeEditLinkParam: Param = {
  key: "includeEditLink",
  label: "Include edit link",
  type: "boolean",
  hint: "Adds an `editLink` to each submission. That link lets whoever holds it edit the " +
    "response without signing in, so leave it off unless a later step needs it.",
};

/**
 * The `limit`/`offset` pair for `GET /forms/{formId}/submissions`.
 *
 * **The vendor's bounds are stated, not guessed**: the OpenAPI fragment
 * declares `limit` as an integer with `minimum: 1`, `maximum: 150`,
 * `default: 50`, and `offset` as an integer defaulting to `0`. The default here
 * is the vendor's own 50 rather than a smaller invention, because the response
 * carries `totalResponses` and `pageCount`, so a caller can tell at a glance
 * that there is more to fetch — the failure mode a lowered default protects
 * against elsewhere does not exist here.
 */
export function submissionPaginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 150 },
      hint: "Submissions per request, 1–150. Fillout's own default is 50.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "How many submissions to skip. Combine with `pageCount` from the response to page " +
        "through the whole set.",
    },
  ];
}

/**
 * `status` — `finished` (the default) or `in_progress`.
 *
 * The vendor's wording is the important part: passing `in_progress` returns the
 * *unfinished* ones, and by default only finished submissions come back. So an
 * empty result is not evidence that nobody started the form.
 */
export const submissionStatusOptions = [
  { value: "finished", label: "Finished — completed submissions (Fillout's default)" },
  { value: "in_progress", label: "In progress — partial, not yet submitted" },
];

/** `sort` — the vendor documents `asc` (default) and `desc`, by submission time. */
export const submissionSortOptions = [
  { value: "asc", label: "Oldest first (Fillout's default)" },
  { value: "desc", label: "Newest first" },
];
