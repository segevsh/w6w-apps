import type { Param } from "@w6w/types";

export const countParam: Param = {
  key: "count",
  label: "Count",
  type: "number",
  hint: "Rows to return, 1 to 100. MoonClerk defaults to 10.",
  validation: { min: 1, max: 100, integer: true },
};

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  hint: "Starting position of the page. Pass the previous call's `nextOffset`.",
  validation: { min: 0, integer: true },
};

export const formIdParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "number",
  hint: "Only rows from this MoonClerk payment form.",
  validation: { integer: true },
};

const DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

/** A `YYYY-MM-DD` filter; MoonClerk reads it in UTC. */
export function dateParam(key: string, label: string, hint: string): Param {
  return {
    key,
    label,
    type: "string",
    placeholder: "2026-01-31",
    hint: `${hint} Format YYYY-MM-DD, UTC.`,
    validation: { pattern: DATE_PATTERN },
  };
}
