import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/**
 * `PUT /incidents/{id}` with `status: "resolved"` — same status-transition
 * mechanism as acknowledge (see `incident-acknowledge.ts`). `resolution` is
 * an optional note added to the incident's "Resolve" log entry (verified
 * against PagerDuty's OpenAPI schema, https://github.com/PagerDuty/api-schema
 * — it is documented as "not displayed directly in the UI"). `From` is
 * REQUIRED, same as every other incident-mutating endpoint.
 */
const action: ActionDefinition = {
  key: "incident-resolve",
  type: "perform",
  resource: "incident",
  title: "Resolve an incident",
  description: "Mark an incident as resolved.",
  idempotent: true,
  params: [
    { key: "incidentId", label: "Incident ID", type: "string", required: true, default: "" },
    {
      key: "from",
      label: "From (Email)",
      type: "string",
      required: true,
      default: "",
      placeholder: "name@example.com",
      hint:
        "Email of a valid user on the account — PagerDuty requires this to attribute the resolve",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "text",
      default: "",
      hint: "Added to the incident's Resolve log entry as a note; not shown directly in the UI",
    },
  ],

  async execute(input, ctx) {
    const { incidentId, from, resolution } = input as {
      incidentId: string;
      from: string;
      resolution?: string;
    };
    if (!incidentId) throw new Error("`incidentId` is required");
    if (!from) {
      throw new Error("`from` is required — PagerDuty attributes the resolve to this user");
    }

    ctx.log("info", "resolving PagerDuty incident", { incidentId });

    const incident: Record<string, unknown> = { type: "incident", status: "resolved" };
    if (resolution) incident.resolution = resolution;

    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>(
      `/incidents/${encodeURIComponent(incidentId)}`,
      { method: "PUT", body: { incident }, from },
    );
    return res.incident;
  },
};

export default action;
