import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  search?: string;
  name?: string;
  team_ids?: string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/schedules` */
const scheduleList: ActionDefinition<Input> = {
  key: "schedule-list",
  type: "read",
  resource: "schedule",
  title: "List Schedules",
  description: "List on-call schedules.",
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
      key: "team_ids",
      label: "Team ids",
      type: "string",
      hint: "Team ID(s).",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/schedules", {
      query: {
        "filter[search]": input.search,
        "filter[name]": input.name,
        "filter[team_ids]": input.team_ids,
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default scheduleList;
