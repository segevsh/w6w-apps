import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { type EventInput, eventInputBody, eventInputParams } from "../lib/params.ts";
import type { AddEventEvent } from "../lib/schema.ts";

/**
 * `POST /events` — create a new event on an existing calendar.
 *
 * `title` and `datetimeStart` are the only two required fields — everything else
 * falls back to a documented default (the account's default calendar, a 1-hour
 * duration, the calendar's own timezone, AddEvent's standard landing page).
 *
 * The response's `link_long`/`link_short` are the whole point of this API: working
 * "add to calendar" URLs for every major client, ready to hand to a user or drop in
 * an email, with no per-vendor calendar-link format to hand-roll.
 */
type Input = EventInput;

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a new calendar event and get back its add-to-calendar links.",
  idempotent: false,
  params: eventInputParams(true),
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
    return new AddEventClient(ctx).json<AddEventEvent>("/events", {
      method: "POST",
      body: eventInputBody(input),
    });
  },
};

export default eventCreate;
