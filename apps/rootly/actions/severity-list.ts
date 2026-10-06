import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient } from "../lib/client.ts";

interface Input {
  search?: string;
  name?: string;
  slug?: string;
  severity?: string;
  color?: string;
  sort?: string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/severities` */
const severityList: ActionDefinition<Input> = {
  key: "severity-list",
  type: "read",
  resource: "severity",
  title: "List Severities",
  description: "List incident severities.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
    },
    {
      key: "severity",
      label: "Severity",
      type: "string",
      hint: "critical, high, medium or low.",
    },
    {
      key: "color",
      label: "Color",
      type: "string",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "e.g. position, -position, created_at.",
    },
    {
      key: "page_number",
      label: "Page number",
      type: "number",
      hint: "1-based page index.",
    },
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      hint: "Items per page.",
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Records, each flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
    {
      key: "meta",
      type: "object",
      label: "Paging: current_page, next_page, next_cursor, total_count, total_pages",
    },
    { key: "links", type: "object", label: "Paging links: self, first, prev, next, last" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", "/v1/severities", {
      query: {
        "filter[search]": input.search,
        "filter[name]": input.name,
        "filter[slug]": input.slug,
        "filter[severity]": input.severity,
        "filter[color]": input.color,
        "sort": input.sort,
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default severityList;
