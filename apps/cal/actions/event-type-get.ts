import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  eventTypeId: number;
}

/**
 * GET /v2/event-types/{eventTypeId} — a single event type.
 * `cal-api-version: 2024-06-14`.
 */
const eventTypeGet: ActionDefinition<Input> = {
  key: "event-type-get",
  type: "read",
  resource: "event-type",
  title: "Get Event Type",
  description: "Fetch a single event type by ID.",
  params: [
    { key: "eventTypeId", label: "Event Type ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Event type" }],

  execute(input, ctx) {
    return new CalClient(ctx).request(`/event-types/${input.eventTypeId}`, {
      headers: { "cal-api-version": CAL_API_VERSION.eventTypes },
    });
  },
};

export default eventTypeGet;
