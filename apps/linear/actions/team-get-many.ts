import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

const QUERY = `
  query Teams($first: Int) {
    teams(first: $first) {
      nodes { id key name description private }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/**
 * Most other actions need a `teamId` UUID, which is not the `ENG`-style key
 * shown in the UI. This is how you look one up.
 */
const teamGetMany: ActionDefinition<{ first?: number }> = {
  key: "team-get-many",
  type: "search",
  resource: "team",
  title: "List Teams",
  description:
    "List the workspace's teams with their UUIDs — the id other actions need, not the ENG-style key.",
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
    { key: "teams.nodes", type: "array", label: "Teams" },
    { key: "teams.pageInfo", type: "object", label: "Page info" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(QUERY, { first: input.first ?? 50 });
  },
};

export default teamGetMany;
