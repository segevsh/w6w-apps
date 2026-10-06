import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "unpublish-event",
  type: "perform",
  resource: "event",
  title: "Unpublish Event",
  description:
    "Unpublish a live event on Eventbrite. Fails if the event has pending or completed orders (with limited exceptions for completed paid events). Unpublishing a series parent unpublishes all occurrences.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [{ key: "unpublished", type: "boolean", label: "Unpublished" }],
  idempotent: false,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/unpublish/`, {
      method: "POST",
    });
  },
};

export default action;
