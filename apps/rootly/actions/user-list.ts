import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  search?: string;
  email?: string;
  sort?: string;
  include?: string[] | string;
  page_number?: number;
  page_size?: number;
}

/** `GET /v1/users` */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users in the organization.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches name and email.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exact email address.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "created_at, updated_at; prefix `-` for descending.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load, comma-separated: email_addresses, phone_numbers, devices, role, on_call_role, teams, schedules, notification_rules.",
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
    const res = await new RootlyClient(ctx).request("GET", "/v1/users", {
      query: {
        "filter[search]": input.search,
        "filter[email]": input.email,
        "sort": input.sort,
        "include": strList(input.include)?.join(","),
        "page[number]": input.page_number,
        "page[size]": input.page_size,
      },
    });
    return listResult(res);
  },
};

export default userList;
