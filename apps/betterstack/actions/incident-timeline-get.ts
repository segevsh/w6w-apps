import type { ActionDefinition } from "@w6w/types";
import { encodeId, listResources, V3 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v3/incidents/{incident_id}/timeline` (Better Stack Uptime API v3).
 */
type Input = {
  incident_id: string;
};

const incidentTimelineGet: ActionDefinition<Input> = {
  key: "incident-timeline-get",
  type: "read",
  resource: "incident",
  title: "Get Incident Timeline",
  description: "The incident's timeline: alerts sent, comments, status changes.",
  params: [
    str("incident_id", "Incident ID", { required: true, hint: "The incident." }),
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
    return listResources(ctx, `${V3}/incidents/${encodeId(input.incident_id)}/timeline`, {});
  },
};

export default incidentTimelineGet;
