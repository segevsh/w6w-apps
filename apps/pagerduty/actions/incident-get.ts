import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/** `GET /incidents/{id}` */
const action: ActionDefinition = {
  key: "incident-get",
  type: "read",
  resource: "incident",
  title: "Get an incident",
  description: "Get a single incident by ID.",
  params: [
    { key: "incidentId", label: "Incident ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const { incidentId } = input as { incidentId: string };
    if (!incidentId) throw new Error("`incidentId` is required");
    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>(
      `/incidents/${encodeURIComponent(incidentId)}`,
    );
    return res.incident;
  },
};

export default action;
