import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const getEventDescription: ActionDefinition<Input> = {
  key: "get-event-description",
  type: "read",
  resource: "event",
  title: "Get Event Description",
  description: "Retrieve the fully rendered HTML description of an event.",
  params: [{ key: "eventId", label: "Event ID", type: "string", required: true }],
  output: [{ key: "description", type: "string", label: "Description (HTML)" }],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/description/`);
  },
};

export default getEventDescription;
