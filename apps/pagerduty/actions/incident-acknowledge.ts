import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/**
 * `PUT /incidents/{id}` with `status: "acknowledged"` — PagerDuty has no
 * separate "acknowledge" endpoint; acknowledging is a status transition on
 * the same update endpoint (verified against PagerDuty's OpenAPI schema,
 * https://github.com/PagerDuty/api-schema — the `status` enum on
 * `PUT /incidents/{id}` is `resolved | acknowledged | triggered`). `From` is
 * REQUIRED: acknowledging to `"triggered"`→`"acknowledged"` assigns the
 * incident to the current user, so PagerDuty needs to know who that is.
 */
const action: ActionDefinition = {
  key: "incident-acknowledge",
  type: "perform",
  resource: "incident",
  title: "Acknowledge an incident",
  description: "Mark an incident as acknowledged.",
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
      hint: "Email of the user acknowledging — the incident is assigned to this user",
    },
  ],

  async execute(input, ctx) {
    const { incidentId, from } = input as { incidentId: string; from: string };
    if (!incidentId) throw new Error("`incidentId` is required");
    if (!from) throw new Error("`from` is required — PagerDuty assigns the ack to this user");

    ctx.log("info", "acknowledging PagerDuty incident", { incidentId });

    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>(
      `/incidents/${encodeURIComponent(incidentId)}`,
      { method: "PUT", body: { incident: { type: "incident", status: "acknowledged" } }, from },
    );
    return res.incident;
  },
};

export default action;
