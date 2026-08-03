import type { ActionDefinition } from "@w6w/types";
import { csv, customFields, FreshserviceClient, unset } from "../lib/client.ts";
import { impactOptions, priorityOptions, statusOptions, ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  subject?: string;
  description?: string;
  status?: number;
  priority?: number;
  urgency?: number;
  impact?: number;
  groupId?: number;
  responderId?: number;
  departmentId?: number;
  category?: string;
  subCategory?: string;
  itemCategory?: string;
  tags?: string;
  dueBy?: string;
  customFields?: unknown;
}

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description:
    "Change a ticket's fields. Only the fields you set are sent, so untouched ones keep their values.",
  // A PUT with the same body converges on the same ticket state.
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "HTML content of the ticket.",
    },
    { key: "status", label: "Status", type: "select", row: "state", options: statusOptions },
    { key: "priority", label: "Priority", type: "select", row: "state", options: priorityOptions },
    { key: "urgency", label: "Urgency", type: "select", row: "risk", options: impactOptions },
    { key: "impact", label: "Impact", type: "select", row: "risk", options: impactOptions },
    { key: "groupId", label: "Group ID", type: "number", row: "route" },
    { key: "responderId", label: "Agent ID", type: "number", row: "route" },
    { key: "departmentId", label: "Department ID", type: "number", advanced: true },
    { key: "category", label: "Category", type: "string", row: "category", advanced: true },
    { key: "subCategory", label: "Sub-category", type: "string", row: "category", advanced: true },
    {
      key: "itemCategory",
      label: "Item category",
      type: "string",
      row: "category",
      advanced: true,
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint:
        "Comma-separated, and REPLACES the ticket's tags — send every tag that should stay attached.",
    },
    { key: "dueBy", label: "Due by", type: "datetime", advanced: true },
    { key: "customFields", label: "Custom fields", type: "json", advanced: true },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource("ticket", `/tickets/${input.ticketId}`, {
      method: "PUT",
      body: {
        subject: unset(input.subject),
        description: unset(input.description),
        status: input.status,
        priority: input.priority,
        urgency: input.urgency,
        impact: input.impact,
        group_id: input.groupId,
        responder_id: input.responderId,
        department_id: input.departmentId,
        category: unset(input.category),
        sub_category: unset(input.subCategory),
        item_category: unset(input.itemCategory),
        tags: csv(input.tags),
        due_by: unset(input.dueBy),
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default ticketUpdate;
