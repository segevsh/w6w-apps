import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
  user_ids?: string[] | string;
  schedule_ids?: string[] | string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/shifts` */
const shiftList: ActionDefinition<Input> = {
  key: "shift-list",
  type: "read",
  resource: "shift",
  title: "List Shifts",
  description:
    "List on-call shifts in a time range, optionally for given users or schedules. With no bounds Rootly returns now through one month ahead.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "Range start, ISO 8601.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Range end, ISO 8601.",
    },
    {
      key: "user_ids",
      label: "User IDs",
      type: "array",
      item: { type: "string" },
      hint: "Integer Rootly user IDs.",
    },
    {
      key: "schedule_ids",
      label: "Schedule IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load, comma-separated: shift_override, user, assignee, shift_shadow.",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/shifts", {
      query: {
        "from": input.from,
        "to": input.to,
        "user_ids[]": strList(input.user_ids),
        "schedule_ids[]": strList(input.schedule_ids),
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default shiftList;
