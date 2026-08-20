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
      // Was a `type: "group"`, which ParamsForm renders as a raw JSON editor —
      // and since this group IS the whole payload, the action could not be
      // configured at all without hand-writing JSON. A section is layout-only:
      // the children render as real inputs and their values arrive flat.
      // Not collapsed: these are the action's content, not extras.
      key: "updateFieldsSection",
      label: "Fields to update",
      type: "section",
      section: "collapsible",
      title: "Fields to update",
      subtitle: "Set only what should change",
      collapsed: false,
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
    {
      key: "updateFields",
      // DEPRECATED — see the section above. Kept declared because
      // `resolveParams` drops any key an action does not declare, so removing
      // it would silently strip values from steps saved against the old shape.
      label: "Update Fields (deprecated)",
      type: "json",
      default: {},
      advanced: true,
      hint: "Superseded by the fields above and kept only so older saved steps keep working. " +
        "Anything set here is used only when the matching field above is empty.",
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

    // A section writes its children FLAT at this level; the deprecated group is
    // the fallback for steps saved against the old nested shape.
    const legacy = (p.updateFields ?? {}) as Record<string, unknown>;
    const fields: Record<string, unknown> = { ...legacy };
    for (const k of ["title", "priorityId", "urgency", "escalationPolicyId", "escalationLevel"]) {
      const v = p[k];
      if (v !== undefined && v !== null && v !== "") fields[k] = v;
    }
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
