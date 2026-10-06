import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient } from "../lib/client.ts";

interface Input {
  search?: string;
  name?: string;
  slug?: string;
  external_id?: string;
  sort?: string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/functionalities` */
const functionalityList: ActionDefinition<Input> = {
  key: "functionality-list",
  type: "read",
  resource: "functionality",
  title: "List Functionalities",
  description: "List functionalities (customer-facing capabilities).",
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
      key: "external_id",
      label: "External id",
      type: "string",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "e.g. name, -name, created_at.",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/functionalities", {
      query: {
        "filter[search]": input.search,
        "filter[name]": input.name,
        "filter[slug]": input.slug,
        "filter[external_id]": input.external_id,
        "sort": input.sort,
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default functionalityList;
