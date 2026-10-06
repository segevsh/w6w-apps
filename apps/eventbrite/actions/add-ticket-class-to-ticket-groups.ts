import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  eventId: string;
  ticketClassId: string;
  ticketGroupIds?: unknown[];
}

const action: ActionDefinition<Input> = {
  key: "add-ticket-class-to-ticket-groups",
  type: "perform",
  idempotent: false,
  resource: "ticket_group",
  title: "Add Ticket Class to Ticket Groups",
  description:
    "Set which of an organization's ticket groups contain a ticket class. Leave the group list empty to remove the ticket class from every ticket group of the organization.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "ticketClassId", label: "Ticket class ID", type: "string", required: true },
    { key: "ticketGroupIds", label: "Ticket group IDs", type: "array", item: { type: "string" } },
  ],
  output: [],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.ticketGroupIds !== undefined) obj.ticket_group_ids = input.ticketGroupIds;
    return await client.request(
      `/organizations/${enc(input.organizationId)}/events/${enc(input.eventId)}/ticket_classes/${
        enc(input.ticketClassId)
      }/ticket_groups/`,
      {
        method: "POST",
        body: obj,
      },
    );
  },
};

export default action;
