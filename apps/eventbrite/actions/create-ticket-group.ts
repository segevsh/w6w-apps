import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  organizationId: string;
  name?: string;
  status?: "live" | "archived" | "deleted" | "transfer";
  eventTicketIds?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "create-ticket-group",
  type: "perform",
  idempotent: false,
  resource: "ticket_group",
  title: "Create Ticket Group",
  description:
    "Create a ticket group in an organization on Eventbrite (max 300 live groups per organization).",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Truncated to 20 characters by Eventbrite.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "live", label: "live" }, { value: "archived", label: "archived" }, {
        value: "deleted",
        label: "deleted",
      }, { value: "transfer", label: "transfer" }],
    },
    {
      key: "eventTicketIds",
      label: "Event ticket IDs",
      type: "json",
      hint: 'Map of event ID to ticket class IDs: {"1": ["12345"]}.',
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      hint:
        "Merged (deep) into the request object for any field not listed above, using Eventbrite's snake_case names.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "event_ticket_ids", type: "object", label: "Event ticket IDs" },
    { key: "tickets", type: "array", label: "Tickets" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.name !== undefined) obj.name = input.name;
    if (input.status !== undefined) obj.status = input.status;
    if (input.eventTicketIds !== undefined) obj.event_ticket_ids = input.eventTicketIds;
    if (input.extra) deepMerge(obj, input.extra);
    return await client.request(`/organizations/${enc(input.organizationId)}/ticket_groups/`, {
      method: "POST",
      body: { ticket_group: obj },
    });
  },
};

export default action;
