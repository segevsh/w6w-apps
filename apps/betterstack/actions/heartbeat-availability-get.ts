import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/heartbeats/{heartbeat_id}/availability` (Better Stack Uptime API v2).
 */
type Input = {
  heartbeat_id: string;
  from?: string;
  to?: string;
};

const heartbeatAvailabilityGet: ActionDefinition<Input> = {
  key: "heartbeat-availability-get",
  type: "read",
  resource: "heartbeat",
  title: "Get Heartbeat Availability",
  description: "Availability summary for a heartbeat over an optional date range.",
  params: [
    str("heartbeat_id", "Heartbeat ID", { required: true, hint: "The heartbeat." }),
    str("from", "From", { hint: "Start date, e.g. 2026-09-01." }),
    str("to", "To", { hint: "End date, e.g. 2026-09-30." }),
  ],
  output: [
    { key: "availability", type: "number", label: "Availability, percent" },
    { key: "total_downtime", type: "number", label: "Seconds down" },
    { key: "number_of_incidents", type: "number", label: "Incident count" },
  ],

  execute(input, ctx) {
    return oneResource(
      ctx,
      "GET",
      `${V2}/heartbeats/${encodeId(input.heartbeat_id)}/availability`,
      {
        query: { from: input.from, to: input.to },
      },
    );
  },
};

export default heartbeatAvailabilityGet;
