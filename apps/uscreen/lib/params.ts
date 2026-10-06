import type { Param } from "@w6w/types";

export const PAGE: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { min: 1, integer: true },
  hint: "Page number, starting at 1. Pagination is in response headers; the result carries " +
    "`hasMore` and `nextPage` parsed from the `Link` header.",
};

export const PER_PAGE: Param = {
  key: "perPage",
  label: "Results per page",
  type: "number",
  validation: { min: 1, max: 100, integer: true },
  hint: "Analytics endpoints only. Default 10 (views) or 50 (summary), maximum 100.",
};

const RFC3339 = "RFC 3339, for example 2023-01-01T00:00:00Z.";

export function rangeParams(extraHint = ""): Param[] {
  return [
    {
      key: "from",
      label: "From",
      type: "string",
      placeholder: "2023-01-01T00:00:00Z",
      hint: `Start of the date range. ${RFC3339}${extraHint}`,
    },
    {
      key: "to",
      label: "To",
      type: "string",
      placeholder: "2023-12-31T23:59:59Z",
      hint: `End of the date range. ${RFC3339}${extraHint ? " Default: now." : ""}`,
    },
  ];
}

export const DATE_FIELD: Param = {
  key: "dateField",
  label: "Date field",
  type: "select",
  options: [
    { value: "created_at", label: "Created at" },
    { value: "updated_at", label: "Updated at" },
  ],
  hint: "Which date the From/To range filters on. Default: created_at.",
};

export const CUSTOMER_ID = (hint = ""): Param => ({
  key: "customerId",
  label: "Customer ID or email",
  type: "string",
  required: true,
  hint: "A customer's numeric id, or their email address (matched case-insensitively)." + hint,
});
