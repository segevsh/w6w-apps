import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, pick, V3 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `POST /api/v3/incidents/{incident_id}/resolve` (Better Stack Uptime API v3).
 */
type Input = {
  incident_id: string;
  resolved_by?: string;
};

const incidentResolve: ActionDefinition<Input> = {
  key: "incident-resolve",
  type: "perform",
  resource: "incident",
  title: "Resolve Incident",
  description: "Resolve an ongoing incident. The vendor answers 409 if it was already resolved.",
  idempotent: false,
  params: [
    str("incident_id", "Incident ID", { required: true, hint: "The incident to resolve." }),
    str("resolved_by", "Resolved by", { hint: "User e-mail or any identifier of who did it." }),
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "status", type: "string", label: "Status after the call" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "POST", `${V3}/incidents/${encodeId(input.incident_id)}/resolve`, {
      body: pick(input, ["resolved_by"]),
    });
  },
};

export default incidentResolve;
