import type { ActionDefinition } from "@w6w/types";
import { listResources, V2 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam, teamNameFilter } from "../lib/params.ts";

/**
 * `GET /api/v2/heartbeats` (Better Stack Uptime API v2).
 */
type Input = {
  team_name?: string;
  page?: number;
  per_page?: number;
};

const heartbeatList: ActionDefinition<Input> = {
  key: "heartbeat-list",
  type: "read",
  resource: "heartbeat",
  title: "List Heartbeats",
  description:
    "List the team's heartbeats (cron-job and scheduled-task monitors that ping Better Stack).",
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
    return listResources(ctx, `${V2}/heartbeats`, {
      team_name: input.team_name,
      ...pagingQuery(input),
    });
  },
};

export default heartbeatList;
