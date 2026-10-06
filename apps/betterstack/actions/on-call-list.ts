import type { ActionDefinition } from "@w6w/types";
import { listResources, V2 } from "../lib/client.ts";
import { pageParam, pagingQuery, perPageParam, teamNameFilter } from "../lib/params.ts";

/**
 * `GET /api/v2/on-calls` (Better Stack Uptime API v2).
 */
type Input = {
  team_name?: string;
  page?: number;
  per_page?: number;
};

const onCallList: ActionDefinition<Input> = {
  key: "on-call-list",
  type: "read",
  resource: "on-call",
  title: "List On-call Calendars",
  description:
    "List on-call calendars and who is on call now. People appear under included[] with name, e-mail and phone numbers.",
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
    return listResources(ctx, `${V2}/on-calls`, {
      team_name: input.team_name,
      ...pagingQuery(input),
    });
  },
};

export default onCallList;
