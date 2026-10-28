import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, FreshdeskClient } from "../lib/client.ts";
import { priorityOptions, statusOptions, ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  status?: number;
  priority?: number;
  groupId?: number;
  responderId?: number;
  tags?: string;
  customFields?: unknown;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Change a ticket's fields. Only the ones you set are touched.",
  // Same ticketId every retry, and Freshdesk's PUT is a partial patch — safe
  // to retry with the same body.
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    { key: "responderId", label: "Agent ID", type: "number", row: "route" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. Replaces existing tags.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: '{ "product": "CRM" }',
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/tickets/${input.ticketId}`, {
      method: "PUT",
      body: {
        status: input.status,
        priority: input.priority,
        group_id: input.groupId,
        responder_id: input.responderId,
        tags: csv(input.tags),
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default ticketUpdate;
