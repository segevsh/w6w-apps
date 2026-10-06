import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  ticketClassId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-ticket-class",
  type: "read",
  resource: "ticket_class",
  title: "Get Ticket Class",
  description: "Retrieve a single ticket class of an event by ID.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "ticketClassId", label: "Ticket class ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "description", type: "string", label: "Description" },
    { key: "cost", type: "object", label: "Cost" },
    { key: "capacity", type: "number", label: "Capacity" },
    { key: "quantity_total", type: "number", label: "Quantity total" },
    { key: "quantity_sold", type: "number", label: "Quantity sold" },
    { key: "sales_start", type: "string", label: "Sales start" },
    { key: "sales_end", type: "string", label: "Sales end" },
    { key: "hidden", type: "boolean", label: "Hidden" },
    { key: "free", type: "boolean", label: "Free" },
    { key: "donation", type: "boolean", label: "Donation" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(
      `/events/${enc(input.eventId)}/ticket_classes/${enc(input.ticketClassId)}/`,
      {
        method: "GET",
      },
    );
  },
};

export default action;
