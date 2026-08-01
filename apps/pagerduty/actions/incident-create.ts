import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/**
 * `POST /incidents` — verified against PagerDuty's OpenAPI schema
 * (https://github.com/PagerDuty/api-schema). The `From` header (a valid
 * user's email on the account) is a REQUIRED parameter on this endpoint per
 * that schema (`from_header`, `required: true`) — PagerDuty attributes every
 * incident mutation to a user, so it is threaded through as a required
 * action param rather than invented.
 */
const action: ActionDefinition = {
  key: "incident-create",
  type: "perform",
  resource: "incident",
  title: "Create an incident",
  description: "Trigger a new incident on a service.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      default: "",
      hint: "A succinct description of the nature, symptoms, cause, or effect of the incident",
    },
    { key: "serviceId", label: "Service ID", type: "string", required: true, default: "" },
    {
      key: "from",
      label: "From (Email)",
      type: "string",
      required: true,
      default: "",
      placeholder: "name@example.com",
      hint:
        "Email of a valid user on the account — PagerDuty requires this to attribute the incident",
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        { key: "details", label: "Incident Details", type: "text", default: "" },
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
        { key: "priorityId", label: "Priority ID", type: "string", default: "" },
        { key: "escalationPolicyId", label: "Escalation Policy ID", type: "string", default: "" },
        {
          key: "incidentKey",
          label: "Incident Key",
          type: "string",
          default: "",
          hint: "De-duplication key: a second request with the same service + key is rejected",
        },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

    const title = String(p.title ?? "").trim();
    const serviceId = String(p.serviceId ?? "").trim();
    const from = String(p.from ?? "").trim();
    if (!title) throw new Error("`title` is required");
    if (!serviceId) throw new Error("`serviceId` is required");
    if (!from) {
      throw new Error("`from` is required — PagerDuty attributes incident creation to a user");
    }

    const incident: Record<string, unknown> = {
      type: "incident",
      title,
      service: { id: serviceId, type: "service_reference" },
    };
    if (additional.details) {
      incident.body = { type: "incident_body", details: String(additional.details) };
    }
    if (additional.urgency) incident.urgency = String(additional.urgency);
    if (additional.priorityId) {
      incident.priority = { id: String(additional.priorityId), type: "priority_reference" };
    }
    if (additional.escalationPolicyId) {
      incident.escalation_policy = {
        id: String(additional.escalationPolicyId),
        type: "escalation_policy_reference",
      };
    }
    if (additional.incidentKey) incident.incident_key = String(additional.incidentKey);

    ctx.log("info", "creating PagerDuty incident", { title, serviceId });

    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>("/incidents", {
      method: "POST",
      body: { incident },
      from,
    });
    return res.incident;
  },
};

export default action;
