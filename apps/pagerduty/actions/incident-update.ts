import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/**
 * `PUT /incidents/{id}` — the general-purpose incident update endpoint.
 * `acknowledge`, `resolve` and `reassign` in this app are thin, purpose-built
 * wrappers around the same endpoint; this action exposes the rest of its
 * fields (title, priority, urgency, escalation policy/level). Verified
 * against PagerDuty's OpenAPI schema (https://github.com/PagerDuty/api-schema).
 * `From` is REQUIRED on this endpoint per that schema.
 */
const action: ActionDefinition = {
  key: "incident-update",
  type: "perform",
  resource: "incident",
  title: "Update an incident",
  description: "Update an incident's title, priority, urgency, or escalation policy/level.",
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
        "Email of a valid user on the account — PagerDuty requires this to attribute the update",
    },
    {
      key: "updateFields",
      label: "Update Fields",
      type: "group",
      default: {},
      children: [
        { key: "title", label: "Title", type: "string", default: "" },
        { key: "priorityId", label: "Priority ID", type: "string", default: "" },
        {
          key: "urgency",
          label: "Urgency",
          type: "select",
          default: "",
          options: [
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
          ],
        },
        { key: "escalationPolicyId", label: "Escalation Policy ID", type: "string", default: "" },
        {
          key: "escalationLevel",
          label: "Escalation Level",
          type: "number",
          default: undefined,
          hint: "Escalate the incident to this level in the escalation policy",
        },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const incidentId = String(p.incidentId ?? "").trim();
    const from = String(p.from ?? "").trim();
    if (!incidentId) throw new Error("`incidentId` is required");
    if (!from) {
      throw new Error("`from` is required — PagerDuty attributes incident updates to a user");
    }

    const fields = (p.updateFields ?? {}) as Record<string, unknown>;
    const incident: Record<string, unknown> = { type: "incident" };
    if (fields.title) incident.title = String(fields.title);
    if (fields.priorityId) {
      incident.priority = { id: String(fields.priorityId), type: "priority_reference" };
    }
    if (fields.urgency) incident.urgency = String(fields.urgency);
    if (fields.escalationPolicyId) {
      incident.escalation_policy = {
        id: String(fields.escalationPolicyId),
        type: "escalation_policy_reference",
      };
    }
    if (fields.escalationLevel !== undefined && fields.escalationLevel !== "") {
      incident.escalation_level = Number(fields.escalationLevel);
    }

    ctx.log("info", "updating PagerDuty incident", { incidentId });

    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>(
      `/incidents/${encodeURIComponent(incidentId)}`,
      { method: "PUT", body: { incident }, from },
    );
    return res.incident;
  },
};

export default action;
