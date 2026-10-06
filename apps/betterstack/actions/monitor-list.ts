import type { ActionDefinition } from "@w6w/types";
import { listResources, scrubMonitor, V2 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam, str, teamNameFilter } from "../lib/params.ts";

/**
 * `GET /api/v2/monitors` (Better Stack Uptime API v2).
 */
type Input = {
  team_name?: string;
  url?: string;
  pronounceable_name?: string;
  page?: number;
  per_page?: number;
};

const monitorList: ActionDefinition<Input> = {
  key: "monitor-list",
  type: "read",
  resource: "monitor",
  title: "List Monitors",
  description: "List the team's monitors (website, ping, port, keyword and other checks).",
  params: [
    teamNameFilter,
    str("url", "URL", { hint: "Only monitors with exactly this URL." }),
    str("pronounceable_name", "Name", { hint: "Only monitors with exactly this name." }),
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
    return listResources(ctx, `${V2}/monitors`, {
      team_name: input.team_name,
      url: input.url,
      pronounceable_name: input.pronounceable_name,
      ...pagingQuery(input),
    }, scrubMonitor);
  },
};

export default monitorList;
