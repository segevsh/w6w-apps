import type { ActionDefinition } from "@w6w/types";
import { PodiumClient, toList } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  search?: string;
  searchFields?: string[] | string;
  includeAgents?: boolean;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the users who belong to any location the token can access. Requires scope `read_users`.",
  params: [{
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Items per page, 1-100 (Podium's default is 10).",
    validation: {
      integer: true,
      min: 1,
      max: 100,
    },
  }, {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint:
      "`nextCursor` from the previous page. A cursor carries its own filters, so when it is set every other filter below is ignored by Podium.",
  }, {
    key: "search",
    label: "Search",
    type: "string",
    hint: "Matched against the fields in `searchFields`.",
  }, {
    key: "searchFields",
    label: "Search fields",
    type: "string",
    hint: "Comma-separated: address, phone, fullName. Default fullName.",
  }, {
    key: "includeAgents",
    label: "Include AI agents",
    type: "boolean",
    hint: "Include users with the ai_agent role (Podium default: true).",
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).list("/users", {
      query: {
        limit: input.limit,
        cursor: input.cursor,
        search: input.search,
        searchFields: toList(input.searchFields),
        includeAgents: input.includeAgents,
      },
    });
  },
};

export default userList;
