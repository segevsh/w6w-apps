import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/monitors/{monitor_id}/sla` (Better Stack Uptime API v2).
 */
type Input = {
  monitor_id: string;
  from?: string;
  to?: string;
};

const monitorAvailabilityGet: ActionDefinition<Input> = {
  key: "monitor-availability-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor Availability",
  description:
    "Availability summary (percentage, downtime, incident counts) for a monitor over an optional date range.",
  params: [
    str("monitor_id", "Monitor ID", { required: true, hint: "The monitor." }),
    str("from", "From", { hint: "Start date, e.g. 2026-09-01." }),
    str("to", "To", { hint: "End date, e.g. 2026-09-30." }),
  ],
  output: [
    { key: "availability", type: "number", label: "Availability, percent" },
    { key: "total_downtime", type: "number", label: "Seconds down" },
    { key: "number_of_incidents", type: "number", label: "Incident count" },
    { key: "longest_incident", type: "number", label: "Longest incident, seconds" },
    { key: "average_incident", type: "number", label: "Average incident, seconds" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "GET", `${V2}/monitors/${encodeId(input.monitor_id)}/sla`, {
      query: { from: input.from, to: input.to },
    });
  },
};

export default monitorAvailabilityGet;
