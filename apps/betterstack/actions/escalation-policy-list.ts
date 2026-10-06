import type { ActionDefinition } from "@w6w/types";
import { listResources, scrubPolicy, V3 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam, teamNameFilter } from "../lib/params.ts";

/**
 * `GET /api/v3/policies` (Better Stack Uptime API v3).
 */
type Input = {
  team_name?: string;
  page?: number;
  per_page?: number;
};

const escalationPolicyList: ActionDefinition<Input> = {
  key: "escalation-policy-list",
  type: "read",
  resource: "escalation-policy",
  title: "List Escalation Policies",
  description: "List escalation policies and their steps.",
  params: [
    teamNameFilter,
    pageParam,
    perPageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Resources on this page" },
    { key: "count", type: "number", label: "Number of items on this page" },
    { key: "hasMore", type: "boolean", label: "Another page exists" },
    {
      key: "nextPage",
      type: "number",
      label: "Page number to request next (null on the last page)",
    },
  ],

  execute(input, ctx) {
    return listResources(ctx, `${V3}/policies`, {
      team_name: input.team_name,
      ...pagingQuery(input),
    }, scrubPolicy);
  },
};

export default escalationPolicyList;
