import type { ActionDefinition } from "@w6w/types";
import { TICKET_BUYER_SETTINGS_OUTPUT, TICKET_BUYER_SETTINGS_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-ticket-buyer-settings",
  type: "read",
  resource: "event",
  title: "Get Ticket Buyer Settings",
  description:
    "Retrieve the ticket buyer settings (confirmation message, instructions, registration survey, refund requests) for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
  ],
  output: TICKET_BUYER_SETTINGS_OUTPUT,
  sample: TICKET_BUYER_SETTINGS_SAMPLE,

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/events/${enc(input.eventId)}/ticket_buyer_settings/`, {
      method: "GET",
    });
  },
};

export default action;
