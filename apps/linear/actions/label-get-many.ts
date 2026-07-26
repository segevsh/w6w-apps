import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

const QUERY = `
  query Labels($filter: IssueLabelFilter, $first: Int) {
    issueLabels(filter: $filter, first: $first) {
      nodes { id name color description team { id key } }
    }
  }
`;

const labelGetMany: ActionDefinition<{ teamId?: string; first?: number }> = {
  key: "label-get-many",
  type: "search",
  resource: "label",
  title: "List Labels",
  description: "List issue labels — the source of the UUIDs used for `labelIds`.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      hint: "Leave empty to include workspace-wide labels from every team.",
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
  ],
  output: [{ key: "issueLabels.nodes", type: "array", label: "Labels" }],

  execute(input, ctx) {
    return new LinearClient(ctx).query(QUERY, {
      filter: input.teamId ? { team: { id: { eq: input.teamId } } } : undefined,
      first: input.first ?? 50,
    });
  },
};

export default labelGetMany;
