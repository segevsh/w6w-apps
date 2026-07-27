import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  event: string;
}

/**
 * GET /scheduled_events/{uuid} — a single booked meeting by URI or UUID.
 */
const scheduledEventGet: ActionDefinition<Input> = {
  key: "scheduled-event-get",
  type: "read",
  resource: "scheduled-event",
  title: "Get Scheduled Event",
  description: "Fetch a single scheduled event by URI or UUID.",
  params: [
    {
      key: "event",
      label: "Event URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/scheduled_events/DDDD or just DDDD.",
    },
  ],
  output: [
    { key: "resource", type: "object", label: "Scheduled event" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request(
      `/scheduled_events/${encodeURIComponent(uuidOf(input.event))}`,
    );
  },
};

export default scheduledEventGet;
