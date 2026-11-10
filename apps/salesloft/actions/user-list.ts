import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  search?: string;
  active?: boolean;
  groupId?: number;
  perPage?: number;
  page?: number;
}

/**
 * GET /v2/users — list/filter Salesloft team members (not CRM contacts).
 * `search` matches First Name, Last Name and Email substrings.
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List and filter Salesloft team members.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Substring match against name and email.",
    },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "groupId", label: "Group ID", type: "number" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      advanced: true,
      hint: "Salesloft's own sort key for this list; omit for its default.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/users", {
      query: compact({
        search: input.search,
        active: input.active,
        group_id: input.groupId,
        per_page: input.perPage,
        page: input.page,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default userList;
