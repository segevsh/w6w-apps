import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the ScoreApp actions.
 *
 * Every key and enum here is the vendor's own spelling, taken from the parameter
 * tables in "ScoreApp Public API - Getting Started" — `order_by`/`order_dir`,
 * `from_date`/`to_date`, `response_count`. ScoreApp is a Laravel app reading
 * snake_case query parameters, so a "tidied" camelCase key is a silently ignored
 * filter rather than an error, which is exactly why the vendor's spelling is kept
 * everywhere.
 */

/**
 * `{scorecard}` — the scorecard path parameter, declared as a **string**.
 *
 * This is the doc self-inconsistency workaround, and it is deliberate rather
 * than sloppy: the vendor's `List Scorecards` example shows UUID ids
 * (`"9e01daab-49c6-428b-9209-b5b0607acad3"`) while the questions, categories and
 * results endpoints document the same parameter as `(integer, required)` and use
 * small integers in their example URLs. Declaring it a `string` and never
 * coercing it is the only reading that works whichever shape an account actually
 * has — so there is no numeric validation on this param either.
 */
export const scorecardParam: Param = {
  key: "scorecard",
  label: "Scorecard",
  type: "string",
  required: true,
  hint:
    "The id a scorecard-list call returned. ScoreApp's own examples show both UUIDs and small " +
    "integers for this parameter, so it is passed through exactly as given and never coerced " +
    "to a number.",
};

/**
 * `{result}` — the result (lead) path parameter, declared as a **string** for
 * exactly the same reason as {@link scorecardParam}.
 */
export const resultParam: Param = {
  key: "result",
  label: "Result",
  type: "string",
  required: true,
  hint:
    "The id a result-list call returned. Passed through exactly as given; the vendor documents " +
    "it as an integer but returns UUID-shaped ids elsewhere, so it is never coerced.",
};

/**
 * `limit` — items per page.
 *
 * Nothing is prefilled: `limit` defaults to 100 on both paginated reads, which
 * is also the documented maximum on `results`, and emptiness is exactly the
 * vendor's own default. Only `results` documents a cap, so only `results` passes
 * one.
 */
export function limitParam(max?: number, hint?: string): Param {
  return {
    key: "limit",
    label: "Page size",
    type: "number",
    ...(max === undefined ? {} : { validation: { integer: true, min: 1, max } }),
    hint: hint ??
      `Items per page. Defaults to 100${max === undefined ? "" : `; ${max} is the maximum`}.`,
  };
}

/** `search` — the one filter spelled the same on both list endpoints. */
export function searchParam(hint: string): Param {
  return { key: "search", label: "Search", type: "string", advanced: true, hint };
}

/**
 * `order_by` — a per-endpoint enum, because the two lists accept different
 * fields. Not a free-text string: an unknown field is a `422`, not a fallback.
 */
export function orderByParam(
  options: Array<{ value: string; label: string }>,
  hint: string,
): Param {
  return { key: "order_by", label: "Order by", type: "select", options, advanced: true, hint };
}

/**
 * `order_dir` — `asc`|`desc`. The vendor's default is `desc` and it is not
 * prefilled, since the documented default is what an empty form already means.
 */
export const orderDirParam: Param = {
  key: "order_dir",
  label: "Direction",
  type: "select",
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ],
  advanced: true,
  hint: "Defaults to descending, the API's own default.",
};

/** `from_date` — an ISO 8601 UTC datetime, as the vendor's own examples show. */
export const fromDateParam: Param = {
  key: "from_date",
  label: "From date",
  type: "datetime",
  advanced: true,
  hint: "Inclusive lower bound on the result's creation time, as an ISO UTC datetime.",
};

/** `to_date` — the other half of {@link fromDateParam}. */
export const toDateParam: Param = {
  key: "to_date",
  label: "To date",
  type: "datetime",
  advanced: true,
  hint: "Inclusive upper bound on the result's creation time, as an ISO UTC datetime.",
};

/**
 * `status` — how far through the scorecard the respondent got.
 *
 * Two states, and the interesting one is `started`: a partial lead is still a
 * lead, and "who began this quiz and stopped" is a question this filter alone can
 * answer.
 */
export const statusParam: Param = {
  key: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "started", label: "Started" },
    { value: "finished", label: "Finished" },
  ],
  advanced: true,
  hint: "Started but unfinished, or completed. Both are leads.",
};

/**
 * `response_count` — whether this lead's is the only pass at the scorecard.
 *
 * A result can be a returning respondent's second attempt, and the vendor
 * separates the two cases rather than exposing a count.
 */
export const resultCountParam: Param = {
  key: "response_count",
  label: "Response count",
  type: "select",
  options: [
    { value: "single", label: "Single response" },
    { value: "multiple", label: "Multiple responses" },
  ],
  advanced: true,
  hint: "Whether this respondent answered the scorecard once or more than once.",
};
