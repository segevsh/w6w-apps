import type { ActionDefinition } from "@w6w/types";
import { OktaClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  q?: string;
  search?: string;
  limit?: number;
  after?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users in the org, optionally filtered by name/email or a SCIM-style filter.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      placeholder: "jane",
      hint: "Matches against firstName, lastName or email (prefix match).",
    },
    {
      key: "search",
      label: "Filter expression",
      type: "string",
      advanced: true,
      placeholder: 'profile.department eq "Engineering"',
      hint: "Okta's SCIM-style filter syntax. Takes precedence over Search when both are set.",
    },
    ...pagination,
  ],
  output: [{ key: "users", type: "array", label: "Users" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request("/users", {
      query: {
        q: unset(input.q),
        search: unset(input.search),
        limit: input.limit,
        after: unset(input.after),
      },
    });
  },
};

export default userList;
