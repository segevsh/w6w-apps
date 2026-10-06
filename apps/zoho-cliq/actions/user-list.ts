import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoCliqClient } from "../lib/client.ts";
import { limitParam, nextTokenParam } from "../lib/params.ts";

interface Input {
  search?: string;
  status?: string;
  limit?: number;
  nextToken?: string;
}

interface Output {
  users: Array<Record<string, unknown>>;
  hasMore: boolean;
  nextToken?: string;
}

/**
 * `GET /api/v2/users` — scope `ZohoCliq.Users.READ`. The page is
 * `{ data: [...], has_more, next_token }`; `limit` maxes at 100.
 */
const userList: ActionDefinition<Input, Output> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the users in the Zoho Cliq organization, optionally searched by name or email.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches the user's name and email address.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "pending", label: "Pending" },
        { value: "imported_active", label: "Imported (active)" },
        { value: "imported_inactive", label: "Imported (inactive)" },
      ],
    },
    limitParam(100),
    nextTokenParam,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "hasMore", type: "boolean", label: "Has more pages" },
    { key: "nextToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { data?: Array<Record<string, unknown>>; has_more?: boolean; next_token?: string }
    >("/users", {
      query: compact({
        search: input.search,
        status: input.status,
        limit: input.limit,
        next_token: input.nextToken,
      }),
    });
    return {
      users: body?.data ?? [],
      hasMore: body?.has_more === true,
      nextToken: body?.next_token,
    };
  },
};

export default userList;
