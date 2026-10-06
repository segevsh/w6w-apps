import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "publish-event",
  type: "perform",
  resource: "event",
  title: "Publish Event",
  description:
    "Publish a draft event on Eventbrite, making it live. Requires a name, description, organizer, at least one ticket and valid payment options. Publishing a series parent publishes all occurrences.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [{ key: "published", type: "boolean", label: "Published" }],
  idempotent: false,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/publish/`, {
      method: "POST",
    });
  },
};

export default action;
