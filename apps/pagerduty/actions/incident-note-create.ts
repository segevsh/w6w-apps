import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/**
 * `POST /incidents/{id}/notes` — add a note (log entry) to an incident.
 * Verified against PagerDuty's OpenAPI schema
 * (https://github.com/PagerDuty/api-schema). `From` is REQUIRED on this
 * endpoint per that schema.
 */
const action: ActionDefinition = {
  key: "incident-note-create",
  type: "perform",
  resource: "incident",
  title: "Create an incident note",
  description: "Add a note to an incident.",
  idempotent: false,
  params: [
    { key: "incidentId", label: "Incident ID", type: "string", required: true, default: "" },
    { key: "content", label: "Content", type: "text", required: true, default: "" },
    {
      key: "from",
      label: "From (Email)",
      type: "string",
      required: true,
      default: "",
      placeholder: "name@example.com",
      hint: "Email of a valid user on the account — PagerDuty requires this to attribute the note",
    },
  ],

  async execute(input, ctx) {
    const { incidentId, content, from } = input as {
      incidentId: string;
      content: string;
      from: string;
    };
    if (!incidentId) throw new Error("`incidentId` is required");
    if (!content) throw new Error("`content` is required");
    if (!from) throw new Error("`from` is required — PagerDuty attributes the note to this user");

    ctx.log("info", "adding note to PagerDuty incident", { incidentId });

    const client = new PagerDutyClient(ctx);
    return await client.request(`/incidents/${encodeURIComponent(incidentId)}/notes`, {
      method: "POST",
      body: { note: { content } },
      from,
    });
  },
};

export default action;
