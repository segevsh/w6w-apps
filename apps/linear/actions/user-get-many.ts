import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

const QUERY = `
  query Users($first: Int) {
    users(first: $first) {
      nodes { id name displayName email active admin }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const userGetMany: ActionDefinition<{ first?: number }> = {
  key: "user-get-many",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the workspace's users — the source of the UUIDs used for `assigneeId`.",
  params: [
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
  ],
  output: [
    { key: "users.nodes", type: "array", label: "Users" },
    { key: "users.pageInfo", type: "object", label: "Page info" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(QUERY, { first: input.first ?? 50 });
  },
};

export default userGetMany;
