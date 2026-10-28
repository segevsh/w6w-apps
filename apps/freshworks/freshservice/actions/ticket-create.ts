import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, FreshserviceClient, unset } from "../lib/client.ts";
import {
  impactOptions,
  priorityOptions,
  sourceOptions,
  statusOptions,
  ticketOutput,
  workspaceId,
} from "../lib/params.ts";

interface Input {
  subject: string;
  description: string;
  requesterEmail?: string;
  requesterId?: number;
  status?: number;
  priority?: number;
  source?: number;
  urgency?: number;
  impact?: number;
  groupId?: number;
  responderId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  tags?: string;
  ccEmails?: string;
  dueBy?: string;
  workspaceId?: number;
  customFields?: unknown;
}

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Raise an incident in the service desk.",
  // Freshservice mints a new ticket id per call and has no create-or-update
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
      hint: "Freshservice creates the requester if this address is unknown.",
    },
    {
      key: "requesterId",
      label: "Requester ID",
      type: "number",
      row: "requester",
      hint: "Use instead of email for an existing requester.",
    },
    { key: "status", label: "Status", type: "select", default: 2, options: statusOptions },
    { key: "priority", label: "Priority", type: "select", default: 1, options: priorityOptions },
    { key: "source", label: "Source", type: "select", default: 2, options: sourceOptions },
    {
      key: "urgency",
      label: "Urgency",
      type: "select",
      row: "risk",
      advanced: true,
      options: impactOptions,
    },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      row: "risk",
      advanced: true,
      options: impactOptions,
    },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    { key: "responderId", label: "Agent ID", type: "number", row: "route" },
    { key: "departmentId", label: "Department ID", type: "number", advanced: true },
    {
      key: "category",
      label: "Category",
      type: "string",
      row: "category",
      advanced: true,
    },
    {
      key: "subCategory",
      label: "Sub-category",
      type: "string",
      row: "category",
      advanced: true,
    },
    {
      key: "itemCategory",
      label: "Item category",
      type: "string",
      row: "category",
      advanced: true,
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated.", advanced: true },
    {
      key: "ccEmails",
      label: "CC emails",
      type: "string",
      hint: "Comma-separated.",
      advanced: true,
    },
    { key: "dueBy", label: "Due by", type: "datetime", advanced: true },
    workspaceId,
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: '{ "custom_text": "value" }',
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource("ticket", "/tickets", {
      method: "POST",
      body: {
        subject: input.subject,
        description: input.description,
        email: unset(input.requesterEmail),
        requester_id: input.requesterId,
        status: input.status,
        priority: input.priority,
        source: input.source,
        urgency: input.urgency,
        impact: input.impact,
        group_id: input.groupId,
        responder_id: input.responderId,
        department_id: input.departmentId,
        category: unset(input.category),
        sub_category: unset(input.subCategory),
        item_category: unset(input.itemCategory),
        tags: csv(input.tags),
        cc_emails: csv(input.ccEmails),
        due_by: unset(input.dueBy),
        workspace_id: input.workspaceId,
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default ticketCreate;
