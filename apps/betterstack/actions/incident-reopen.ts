import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, pick, V3 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `POST /api/v3/incidents/{incident_id}/reopen` (Better Stack Uptime API v3).
 */
type Input = {
  incident_id: string;
  reopened_by?: string;
};

const incidentReopen: ActionDefinition<Input> = {
  key: "incident-reopen",
  type: "perform",
  resource: "incident",
  title: "Reopen Incident",
  description: "Reopen a resolved incident.",
  idempotent: false,
  params: [
    str("incident_id", "Incident ID", { required: true, hint: "The incident to reopen." }),
    str("reopened_by", "Reopened by", { hint: "User e-mail or any identifier of who did it." }),
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "status", type: "string", label: "Status after the call" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "POST", `${V3}/incidents/${encodeId(input.incident_id)}/reopen`, {
      body: pick(input, ["reopened_by"]),
    });
  },
};

export default incidentReopen;
