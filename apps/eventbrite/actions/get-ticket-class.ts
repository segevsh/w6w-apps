import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { TICKET_CLASS_OUTPUT, TICKET_CLASS_SAMPLE } from "../lib/outputs.ts";

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
  output: TICKET_CLASS_OUTPUT,
  sample: TICKET_CLASS_SAMPLE,

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
