import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import {
  buildEventBody,
  EVENT_OUTPUT,
  eventFieldParams,
  type EventFields,
} from "./create-event.ts";

interface Input extends EventFields {
  eventId: string;
}

const updateEvent: ActionDefinition<Input> = {
  key: "update-event",
  type: "perform",
  idempotent: true,
  resource: "event",
  title: "Update Event",
  description:
    "Update an event on Eventbrite. Only the fields you set are changed. On a series parent, name, description, currency, capacity and similar fields cascade to every occurrence. Start/end require a timezone.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    ...eventFieldParams({ create: false }),
  ],
  output: [...EVENT_OUTPUT],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/`, {
      method: "POST",
      body: { event: buildEventBody(input) },
    });
  },
};

export default updateEvent;
