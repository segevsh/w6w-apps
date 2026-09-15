import type { Param } from "@w6w/types";

/**
 * NationBuilder's page-number pagination (`core/api-v2-concepts`, fetched
 * 2026-09-15): `page[size]` (default 20, max 100) and `page[number]`
 * (starting at 1).
 */
export const pagination: Param[] = [
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    row: "page",
    hint: "Defaults to 20. NationBuilder caps this at 100.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "pageNumber",
    label: "Page number",
    type: "number",
    row: "page",
    hint: "Starts at 1.",
    validation: { min: 1, integer: true },
  },
];

export const FILTER_PARAM: Param = {
  key: "filter",
  label: "Filter (JSON)",
  type: "json",
  advanced: true,
  hint: 'Key/value pairs, e.g. {"email": "a@b.com"}. A key may carry a documented operator ' +
    'suffix, e.g. {"donations_amount_in_cents][gt": 500} filters on amounts over $5. ' +
    "See NationBuilder's filtering documentation.",
};

export const SORT_PARAM: Param = {
  key: "sort",
  label: "Sort by",
  type: "string",
  advanced: true,
  hint: "An attribute name. Prefix with - for descending, e.g. -created_at.",
};

export const ATTRIBUTES_PARAM: Param = {
  key: "attributes",
  label: "Additional attributes (JSON)",
  type: "json",
  advanced: true,
  hint: "Any other documented attribute this action does not expose directly, as a JSON object.",
};

export const CUSTOM_VALUES_PARAM: Param = {
  key: "customValues",
  label: "Custom field values (JSON)",
  type: "json",
  advanced: true,
  hint: 'Values for this nation\'s own custom fields, e.g. {"volunteer_shirt_size": "L"}. ' +
    "See the custom-field-list action for the fields a nation has defined.",
};
