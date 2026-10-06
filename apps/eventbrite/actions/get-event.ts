import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { EVENT_OUTPUT } from "./create-event.ts";

interface Input {
  eventId: string;
  expand?: string;
}

const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  idempotent: true,
  resource: "event",
  title: "Get Event",
  description: "Retrieve a single event by ID.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "expand", label: "Expand", type: "string", default: "venue,ticket_classes" },
  ],
  // `expand` (default `venue,ticket_classes`) inlines these alongside the event.
  output: [
    ...EVENT_OUTPUT,
    { key: "venue", type: "object", label: "Venue (expanded)" },
    { key: "venue.name", type: "string", label: "Venue name" },
    { key: "venue.address.localized_address_display", type: "string", label: "Venue address" },
    { key: "venue.address.city", type: "string", label: "Venue city" },
    { key: "ticket_classes", type: "array", label: "Ticket classes (expanded)" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/`, {
      query: { expand: input.expand ?? "venue,ticket_classes" },
    });
  },
};

export default getEvent;
