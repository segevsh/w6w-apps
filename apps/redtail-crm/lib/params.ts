import type { Param } from "@w6w/types";

/**
 * `page`, shared by every list-shaped action. Verified against every listing
 * endpoint's own example URL (`?page=1`) and response body (`meta:
 * {total_records, total_pages}`) — Redtail exposes only page NUMBER, no
 * page-size override.
 */
export const pageParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    advanced: true,
    hint: "1-indexed. Defaults to the first page.",
    validation: { min: 1, integer: true },
  },
];

export interface PageInput {
  page?: number;
}

export function pageQuery(input: PageInput): Record<string, number | undefined> {
  return { page: input.page };
}
