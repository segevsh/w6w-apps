import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V3 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v3/incidents/{incident_id}` (Better Stack Uptime API v3).
 */
type Input = {
  incident_id: string;
};

const incidentGet: ActionDefinition<Input> = {
  key: "incident-get",
  type: "read",
  resource: "incident",
  title: "Get Incident",
  description: "Fetch one incident: cause, timing, acknowledgement and resolution.",
  params: [
    str("incident_id", "Incident ID", { required: true, hint: "The incident's numeric ID." }),
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "cause", type: "string", label: "Cause" },
    { key: "status", type: "string", label: "Started, Acknowledged or Resolved" },
    { key: "started_at", type: "string", label: "Start time" },
    { key: "acknowledged_at", type: "string", label: "Acknowledged at" },
    { key: "resolved_at", type: "string", label: "Resolved at" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "GET", `${V3}/incidents/${encodeId(input.incident_id)}`);
  },
};

export default incidentGet;
