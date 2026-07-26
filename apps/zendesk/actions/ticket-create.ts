import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, unset, ZendeskClient } from "../lib/client.ts";
import { priorityOptions, statusOptions, ticketOutput } from "../lib/params.ts";

interface Input {
  subject: string;
  description: string;
  requesterEmail?: string;
  requesterName?: string;
  assigneeId?: number;
  groupId?: number;
  type?: string;
  status?: string;
  priority?: string;
  tags?: string;
  externalId?: string;
  customFields?: unknown;
}

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Open a support ticket. The description becomes its first public comment.",
  // Zendesk mints a new ticket id per call. Set External ID and use
  // `ticket-create-or-update` if you need a retry to converge.
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Becomes the ticket's first comment.",
    },
    {
      key: "requesterEmail",
      label: "Requester email",
      type: "string",
      row: "requester",
      hint: "Zendesk creates the end user if this address is unknown.",
    },
    { key: "requesterName", label: "Requester name", type: "string", row: "requester" },
    { key: "assigneeId", label: "Assignee ID", type: "number", row: "route" },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "problem", label: "Problem" },
        { value: "incident", label: "Incident" },
        { value: "question", label: "Question" },
        { value: "task", label: "Task" },
      ],
    },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint:
        "Your own identifier for this ticket. Searchable, and the key `ticket-create-or-update` matches on.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Either { "360001": "value" } or [{ "id": 360001, "value": "value" }].',
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/tickets.json", {
      method: "POST",
      body: {
        ticket: {
          subject: input.subject,
          comment: { body: input.description },
          requester: input.requesterEmail
            ? { email: input.requesterEmail, name: unset(input.requesterName) }
            : undefined,
          assignee_id: input.assigneeId,
          group_id: input.groupId,
          type: unset(input.type),
          status: unset(input.status),
          priority: unset(input.priority),
          tags: csv(input.tags),
          external_id: unset(input.externalId),
          custom_fields: customFields(input.customFields),
        },
      },
    });
  },
};

export default ticketCreate;
