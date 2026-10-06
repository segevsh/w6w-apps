import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "delete-event",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description:
    "Permanently delete an event on Eventbrite. Fails if the event has pending or completed orders. Deleting a series parent deletes all occurrences.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/`, {
      method: "DELETE",
    });
  },
};

export default action;
