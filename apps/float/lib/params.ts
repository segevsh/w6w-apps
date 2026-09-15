import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Float actions.
 *
 * Every field here is copied from Float's Swagger v3 document (fetched
 * 2026-09-15 from `developer.float.com/swagger-api-v3.yaml` and its
 * `paths/*.yaml` includes), not inferred.
 */

/** `page` / `per-page` — the offset pagination every list endpoint documents. */
export function paginationParams(defaultPerPage = 20): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "Page number of results to return. Defaults to 1.",
    },
    {
      key: "per-page",
      label: "Per page",
      type: "number",
      default: defaultPerPage,
      validation: { integer: true, min: 1, max: 200 },
      hint: "Number of items per page, max 200. The vendor default is 50; this app prefills a " +
        "smaller value so a first call does not silently return a large page.",
    },
  ];
}

/** `fields` — comma-delimited projection, offered on most list endpoints. */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  advanced: true,
  hint: "Comma-delimited set of fields to include in the response. Leave empty for every field.",
};

/** `sort` — ascending by default, `-field` for descending. */
export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "string",
  advanced: true,
  hint: "A field to sort by, ascending by default; prefix with `-` for descending. Which fields " +
    "are sortable varies per endpoint.",
};

/** `modified_since` — incremental sync. */
export const modifiedSinceParam: Param = {
  key: "modified_since",
  label: "Modified since",
  type: "string",
  advanced: true,
  placeholder: "2025-01-01 00:00:00",
  hint: "Only return records modified at or after this date/time (`YYYY-MM-DD hh:mm:ss`, or a " +
    "Unix timestamp in seconds).",
};

/** `active` — `1` = active, `0` = archived. */
export const activeParam: Param = {
  key: "active",
  label: "Active only",
  type: "select",
  options: [
    { value: "1", label: "Active" },
    { value: "0", label: "Archived / inactive" },
  ],
  hint: "Leave empty to return both active and archived/inactive records.",
};

/** `start_date` / `end_date` — must be supplied together, `YYYY-MM-DD`. */
export function dateRangeParams(hint?: string): Param[] {
  return [
    {
      key: "start_date",
      label: "Start date",
      type: "date",
      hint: hint ?? "Start of the date range (YYYY-MM-DD). Must be used together with End date.",
    },
    {
      key: "end_date",
      label: "End date",
      type: "date",
      hint: "End of the date range (YYYY-MM-DD). Must be used together with Start date.",
    },
  ];
}

/** A required integer id path param, e.g. `people_id`, `project_id`. */
export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "number", required: true, validation: { integer: true }, hint };
}

/**
 * Float's repeat-frequency enum — identical wording and values across every
 * resource that can repeat (allocations, statuses, time off).
 */
export const repeatStateOptions = [
  { value: 0, label: "No repeat" },
  { value: 1, label: "Weekly" },
  { value: 2, label: "Monthly" },
  { value: 3, label: "Every two weeks" },
  { value: 4, label: "Every three weeks" },
  { value: 5, label: "Every six weeks" },
  { value: 6, label: "Every two months" },
  { value: 7, label: "Every three months" },
  { value: 8, label: "Every six months" },
  { value: 9, label: "Yearly" },
];

export const repeatStateParam: Param = {
  key: "repeat_state",
  label: "Repeats",
  type: "select",
  options: repeatStateOptions,
  advanced: true,
};

export const repeatEndDateParam: Param = {
  key: "repeat_end_date",
  label: "Repeat end date",
  type: "date",
  advanced: true,
  hint: 'Date the repeating record stops. Only meaningful when Repeats is not "No repeat".',
};

/**
 * `extraFields` — merged into the request body, overriding the typed fields
 * above it. Every create/update action in this app types the fields people
 * reach for most often and offers this escape hatch for the rest, rather
 * than generating a form for every property Float's schema documents.
 */
export function extraFieldsParam(hint: string): Param {
  return {
    key: "extraFields",
    label: "Additional fields",
    type: "json",
    advanced: true,
    hint: `Merged into the request body, overriding the fields above. ${hint}`,
  };
}
