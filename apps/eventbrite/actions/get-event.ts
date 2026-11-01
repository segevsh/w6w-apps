import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { EVENT_EXPANSIONS } from "../lib/expansions.ts";
import { EVENT_EXPANDED_OUTPUT, EVENT_EXPANDED_SAMPLE } from "../lib/outputs.ts";

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
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: EVENT_EXPANSIONS,
      config: { valueFormat: "csv" },
      default: "venue,ticket_classes",
    },
  ],
  // `expand` (default `venue,ticket_classes`) inlines these alongside the event.
  output: EVENT_EXPANDED_OUTPUT,
  sample: EVENT_EXPANDED_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/`, {
      query: { expand: input.expand ?? "venue,ticket_classes" },
    });
  },
};

export default getEvent;
