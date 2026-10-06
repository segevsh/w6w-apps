import type { ActionDefinition } from "@w6w/types";
import { listResources, V3 } from "../lib/client.ts";
import {
  pageParam,
  pagingQuery,
  perPageParam,
  select,
  str,
  teamNameFilter,
  triStateOptions,
} from "../lib/params.ts";

/**
 * `GET /api/v3/incidents` (Better Stack Uptime API v3).
 */
type Input = {
  team_name?: string;
  from?: string;
  to?: string;
  monitor_id?: string;
  heartbeat_id?: string;
  resolved?: string;
  acknowledged?: string;
  page?: number;
  per_page?: number;
};

const incidentList: ActionDefinition<Input> = {
  key: "incident-list",
  type: "read",
  resource: "incident",
  title: "List Incidents",
  description:
    "List incidents, optionally filtered by date range, monitor, heartbeat, or resolved/acknowledged state. The vendor's default page size is 10 (maximum 50).",
  params: [
    teamNameFilter,
    str("from", "From", { hint: "Incidents from this date (YYYY-MM-DD)." }),
    str("to", "To", { hint: "Incidents until this date (YYYY-MM-DD)." }),
    str("monitor_id", "Monitor ID", { hint: "Only incidents of this monitor." }),
    str("heartbeat_id", "Heartbeat ID", { hint: "Only incidents of this heartbeat." }),
    select("resolved", "Resolved", triStateOptions, { hint: "Leave empty for both." }),
    select("acknowledged", "Acknowledged", triStateOptions, { hint: "Leave empty for both." }),
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
    return listResources(ctx, `${V3}/incidents`, {
      team_name: input.team_name,
      from: input.from,
      to: input.to,
      monitor_id: input.monitor_id,
      heartbeat_id: input.heartbeat_id,
      resolved: input.resolved,
      acknowledged: input.acknowledged,
      ...pagingQuery(input),
    });
  },
};

export default incidentList;
