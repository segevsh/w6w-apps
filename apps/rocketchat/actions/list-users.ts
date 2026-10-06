import type { ActionDefinition } from "@w6w/types";
import { COUNT_PARAM, OFFSET_PARAM, RocketChatClient, SORT_PARAM } from "../lib/client.ts";

interface Input {
  email?: string;
  count?: number;
  offset?: number;
  sort?: string;
}

// `query` is documented as unsafe and deprecated (no replacement for text search), so it is not
// exposed; `email` is the supported filter.
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List workspace users (`GET /users.list`). Needs `view-d-room`; richer fields need " +
    "`view-full-other-user-info`.",
  params: [
    { key: "email", label: "Email filter", type: "string", hint: "Filter users by email address." },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
    { ...SORT_PARAM },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "total", type: "number", label: "Total users" },
  ],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/users.list", {
      query: { email: input.email, count: input.count, offset: input.offset, sort: input.sort },
    });
  },
};

export default listUsers;
