import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, unset, ZendeskClient } from "../lib/client.ts";
import { priorityOptions, statusOptions, ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  subject?: string;
  status?: string;
  priority?: string;
  assigneeId?: number;
  groupId?: number;
  tags?: string;
  customFields?: unknown;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Update a ticket's fields. To add a reply instead, use `ticket-add-comment`.",
  // A PUT writes absolute values, so replaying converges on the same ticket.
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "assigneeId", label: "Assignee ID", type: "number", row: "route" },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES the ticket's current tags.",
    },
    { key: "customFields", label: "Custom fields", type: "json", advanced: true },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/tickets/${input.ticketId}.json`, {
      method: "PUT",
      body: {
        ticket: {
          subject: unset(input.subject),
          status: unset(input.status),
          priority: unset(input.priority),
          assignee_id: input.assigneeId,
          group_id: input.groupId,
          tags: csv(input.tags),
          custom_fields: customFields(input.customFields),
        },
      },
    });
  },
};

export default ticketUpdate;
