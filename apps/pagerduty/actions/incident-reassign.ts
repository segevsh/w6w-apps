import type { ActionDefinition } from "@w6w/types";
import { csv, PagerDutyClient } from "../lib/client.ts";

/**
 * `PUT /incidents/{id}` with an `assignments` array — PagerDuty has no
 * separate "reassign" endpoint; reassignment is the `assignments` field on
 * the same update endpoint (verified against PagerDuty's OpenAPI schema,
 * https://github.com/PagerDuty/api-schema: `assignments[].assignee` is a
 * `UserReference`, `{ id, type: "user_reference" }`). `From` is REQUIRED,
 * same as every other incident-mutating endpoint.
 */
const action: ActionDefinition = {
  key: "incident-reassign",
  type: "perform",
  resource: "incident",
  title: "Reassign an incident",
  description: "Reassign an incident to one or more users.",
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
        "Email of a valid user on the account — PagerDuty requires this to attribute the reassign",
    },
    {
      key: "userIds",
      label: "Assignee User IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated list of user IDs to assign the incident to",
    },
  ],

  async execute(input, ctx) {
    const { incidentId, from, userIds } = input as {
      incidentId: string;
      from: string;
      userIds: string;
    };
    if (!incidentId) throw new Error("`incidentId` is required");
    if (!from) {
      throw new Error("`from` is required — PagerDuty attributes the reassign to this user");
    }
    const ids = csv(userIds);
    if (!ids || ids.length === 0) throw new Error("`userIds` must list at least one user ID");

    ctx.log("info", "reassigning PagerDuty incident", { incidentId, userIds: ids });

    const assignments = ids.map((id) => ({ assignee: { id, type: "user_reference" } }));
    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ incident: unknown }>(
      `/incidents/${encodeURIComponent(incidentId)}`,
      { method: "PUT", body: { incident: { type: "incident", assignments } }, from },
    );
    return res.incident;
  },
};

export default action;
