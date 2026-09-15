import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { eventIdParam, type EventInput, eventInputBody, eventInputParams } from "../lib/params.ts";
import type { AddEventEvent } from "../lib/schema.ts";

/**
 * `PATCH /events/{event_id}` — update an event.
 *
 * Only the fields provided are changed; anything omitted is left unchanged. This is
 * the vendor's own documented PATCH semantics, which is why no field below is
 * required beyond the event id itself.
 */
interface Input extends EventInput {
  eventId: string;
}

const eventUpdate: ActionDefinition<Input> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Update an event. Only the fields you set are changed; everything else is left " +
    "as-is.",
  idempotent: true,
  params: [eventIdParam, ...eventInputParams(false)],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "datetime_start", type: "string", label: "Start" },
    { key: "datetime_end", type: "string", label: "End" },
    { key: "link_long", type: "string", label: "Public event page URL" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    const { eventId, ...body } = input;
    return new AddEventClient(ctx).json<AddEventEvent>(
      `/events/${encodeURIComponent(eventId)}`,
      { method: "PATCH", body: eventInputBody(body) },
    );
  },
};

export default eventUpdate;
