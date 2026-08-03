/**
 * Params shared by Jotform's paginated list endpoints.
 *
 * Jotform documents `offset` / `limit` / `orderby` / `filter` on the list
 * endpoints' response samples ("offset is start of each result set…",
 * "orderby orders results by a submission field name", "filter filters the
 * query results…"). `direction` is not named in those samples but IS
 * documented on Jotform's own Node client (`PaginationParameters.direction:
 * "ASC" | "DESC"`), which is the vendor's first-party source, so it is offered
 * here as an optional extra rather than assumed.
 */
import type { Param } from "@w6w/types";

export interface PaginationInput {
  offset?: number;
  limit?: number;
  orderby?: string;
  direction?: string;
  filter?: unknown;
}

export const pagination: Param[] = [
  {
    key: "offset",
    label: "Offset",
    type: "number",
    hint: "Start of the result set. Defaults to 0.",
    validation: { min: 0, integer: true },
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Number of results in the set. Jotform's default is 20.",
    validation: { min: 1, integer: true },
  },
  {
    key: "orderby",
    label: "Order by",
    type: "string",
    hint:
      "Field to sort by, e.g. `id`, `form_id`, `IP`, `created_at`, `status`, `new`, `flag`, `updated_at`.",
  },
  {
    key: "direction",
    label: "Direction",
    type: "select",
    options: [
      { value: "ASC", label: "Ascending" },
      { value: "DESC", label: "Descending" },
    ],
  },
  {
    key: "filter",
    label: "Filter",
    type: "json",
    hint:
      'JSON filter object, e.g. {"created_at:gt":"2013-01-01 00:00:00"} or {"fullText":"John Brown"}.',
  },
];

/** The `output` block every paginated list action declares. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Results" },
  { key: "resultSet", type: "object" as const, label: "Paging info (offset, limit, count)" },
  { key: "limitLeft", type: "number" as const, label: "Daily API calls remaining" },
];
