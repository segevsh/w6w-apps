import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/appts?leadId={leadId}` — a lead's appointments.
 *
 * Answers a bare array. Each entry has `descr`, `address`, `deadline` and
 * `endTime` (**millisecond** epochs, like lead activities), plus `allDay`,
 * `finishFlag`, `overdue`, `deleteFlag` and the assignee fields.
 *
 * ## Nothing is filtered out
 *
 * Finished and deleted appointments are in the list — `finishFlag` and
 * `deleteFlag` say so. A workflow counting "upcoming appointments" has to do
 * that filtering itself; the endpoint will not.
 *
 * The caller must have manage permission on the lead.
 */
interface Input {
  leadId: number;
}

const action: ActionDefinition<Input> = {
  key: "appointment-list",
  type: "read",
  resource: "appointment",
  title: "List Appointments",
  description: "List the appointments attached to a lead (GET /v1.0/appts).",
  params: [leadIdParam],
  output: [{ key: "", type: "array", label: "Appointments" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/appts", { query: { leadId: input.leadId } });
  },
};

export default action;
