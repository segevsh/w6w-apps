import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, FreshdeskClient, unset } from "../lib/client.ts";
import { priorityOptions, sourceOptions, statusOptions, ticketOutput } from "../lib/params.ts";

interface Input {
  subject: string;
  description: string;
  requesterEmail?: string;
  requesterId?: number;
  status?: number;
  priority?: number;
  source?: number;
  groupId?: number;
  responderId?: number;
  companyId?: number;
  tags?: string;
  ccEmails?: string;
  customFields?: unknown;
}

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Open a support ticket.",
  // Freshdesk mints a new ticket id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "HTML content of the ticket.",
    },
    {
      key: "requesterEmail",
      label: "Requester email",
      type: "string",
      row: "requester",
      hint: "Freshdesk creates the contact if this address is unknown.",
    },
    {
      key: "requesterId",
      label: "Requester ID",
      type: "number",
      row: "requester",
      hint: "Use instead of email for an existing contact.",
    },
    { key: "status", label: "Status", type: "select", default: 2, options: statusOptions },
    { key: "priority", label: "Priority", type: "select", default: 1, options: priorityOptions },
    { key: "source", label: "Source", type: "select", default: 2, options: sourceOptions },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    { key: "responderId", label: "Agent ID", type: "number", row: "route" },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated.", advanced: true },
    {
      key: "ccEmails",
      label: "CC emails",
      type: "string",
      hint: "Comma-separated.",
      advanced: true,
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
    return new FreshdeskClient(ctx).request("/tickets", {
      method: "POST",
      body: {
        subject: input.subject,
        description: input.description,
        email: unset(input.requesterEmail),
        requester_id: input.requesterId,
        status: input.status,
        priority: input.priority,
        source: input.source,
        group_id: input.groupId,
        responder_id: input.responderId,
        company_id: input.companyId,
        tags: csv(input.tags),
        cc_emails: csv(input.ccEmails),
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default ticketCreate;
