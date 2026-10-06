import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, pick, V3 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `POST /api/v3/incidents/{incident_id}/acknowledge` (Better Stack Uptime API v3).
 */
type Input = {
  incident_id: string;
  acknowledged_by?: string;
};

const incidentAcknowledge: ActionDefinition<Input> = {
  key: "incident-acknowledge",
  type: "perform",
  resource: "incident",
  title: "Acknowledge Incident",
  description:
    "Acknowledge an ongoing incident. The vendor answers 409 if it was already acknowledged.",
  idempotent: false,
  params: [
    str("incident_id", "Incident ID", { required: true, hint: "The incident to acknowledge." }),
    str("acknowledged_by", "Acknowledged by", {
      hint: "User e-mail or any identifier of who did it.",
    }),
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "status", type: "string", label: "Status after the call" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "POST", `${V3}/incidents/${encodeId(input.incident_id)}/acknowledge`, {
      body: pick(input, ["acknowledged_by"]),
    });
  },
};

export default incidentAcknowledge;
