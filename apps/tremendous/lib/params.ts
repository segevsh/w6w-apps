import type { Param } from "@w6w/types";

/**
 * `offset`/`limit` params shared by `order-list` and `reward-list` —
 * Tremendous's only two paginated list endpoints (`list-orders`,
 * `list-rewards` OpenAPI docs). Campaigns and funding sources are NOT
 * paginated: neither `list-campaigns` nor `list-funding-sources` declares any
 * query parameter at all, and both return every item in one response.
 */
export function paginationParams(defaultLimit: number, maxLimit: number): Param[] {
  return [
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Skip this many, ordered by creation date (newest first).",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      hint: `Maximum ${maxLimit}.`,
      validation: { max: maxLimit, integer: true },
    },
  ];
}
