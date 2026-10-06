import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "cancel-event",
  type: "perform",
  resource: "event",
  title: "Cancel Event",
  description:
    "Cancel an event on Eventbrite. Fails if the event has pending or completed orders. Canceling a series parent cancels all occurrences.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [{ key: "canceled", type: "boolean", label: "Canceled" }],
  idempotent: false,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/cancel/`, {
      method: "POST",
    });
  },
};

export default action;
