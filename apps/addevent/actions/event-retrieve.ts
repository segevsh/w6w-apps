import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";
import type { AddEventEvent } from "../lib/schema.ts";

/** `GET /events/{event_id}` — retrieve one event object. */
interface Input {
  eventId: string;
}

const eventRetrieve: ActionDefinition<Input> = {
  key: "event-retrieve",
  type: "read",
  resource: "event",
  title: "Retrieve Event",
  description: "Fetch one event by id.",
  params: [eventIdParam],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "unique_key", type: "string", label: "Public share key" },
    { key: "title", type: "string", label: "Title" },
    { key: "calendar_id", type: "string", label: "Calendar ID" },
    { key: "datetime_start", type: "string", label: "Start" },
    { key: "datetime_end", type: "string", label: "End" },
    { key: "link_long", type: "string", label: "Public event page URL" },
    { key: "link_short", type: "string", label: "Short public event page URL" },
    { key: "rsvp", type: "object", label: "RSVP settings and stats" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AddEventEvent>(
      `/events/${encodeURIComponent(input.eventId)}`,
    );
  },
};

export default eventRetrieve;
