import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  search?: string;
  name?: string;
  slug?: string;
  external_id?: string;
  sort?: string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/services` */
const serviceList: ActionDefinition<Input> = {
  key: "service-list",
  type: "read",
  resource: "service",
  title: "List Services",
  description: "List services in the catalog.",
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
      hint: "e.g. name, -name, created_at, -created_at.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint: "Related records to side-load, comma-separated.",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/services", {
      query: {
        "filter[search]": input.search,
        "filter[name]": input.name,
        "filter[slug]": input.slug,
        "filter[external_id]": input.external_id,
        "sort": input.sort,
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default serviceList;
