import type { ActionDefinition } from "@w6w/types";
import { encodeId, listResources, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/incidents/{incident_id}/comments` (Better Stack Uptime API v2).
 */
type Input = {
  incident_id: string;
};

const incidentCommentList: ActionDefinition<Input> = {
  key: "incident-comment-list",
  type: "read",
  resource: "incident",
  title: "List Incident Comments",
  description: "Comments posted on an incident.",
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
    return listResources(ctx, `${V2}/incidents/${encodeId(input.incident_id)}/comments`, {});
  },
};

export default incidentCommentList;
