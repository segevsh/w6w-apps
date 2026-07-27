import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  eventType: string;
}

/**
 * GET /event_types/{uuid} — a single event type by URI or UUID.
 */
const eventTypeGet: ActionDefinition<Input> = {
  key: "event-type-get",
  type: "read",
  resource: "event-type",
  title: "Get Event Type",
  description: "Fetch a single event type by URI or UUID.",
  params: [
    {
      key: "eventType",
      label: "Event Type URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/event_types/CCCC or just CCCC.",
    },
  ],
  output: [
    { key: "resource", type: "object", label: "Event type" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request(
      `/event_types/${encodeURIComponent(uuidOf(input.eventType))}`,
    );
  },
};

export default eventTypeGet;
