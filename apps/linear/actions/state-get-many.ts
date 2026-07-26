import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

const QUERY = `
  query States($filter: WorkflowStateFilter, $first: Int) {
    workflowStates(filter: $filter, first: $first) {
      nodes { id name type position team { id key } }
    }
  }
`;

/**
 * Workflow states are per-team, so "Done" on one team is a different UUID from
 * "Done" on another. Look them up per team before setting `stateId`.
 */
const stateGetMany: ActionDefinition<{ teamId?: string; first?: number }> = {
  key: "state-get-many",
  type: "search",
  resource: "state",
  title: "List Workflow States",
  description:
    "List workflow states. They are per-team — the same name has a different id on each team.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", hint: "Leave empty for every team." },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
  ],
  output: [{ key: "workflowStates.nodes", type: "array", label: "Workflow states" }],

  execute(input, ctx) {
    return new LinearClient(ctx).query(QUERY, {
      filter: input.teamId ? { team: { id: { eq: input.teamId } } } : undefined,
      first: input.first ?? 50,
    });
  },
};

export default stateGetMany;
