import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  calendarId?: string;
}

/**
 * `DELETE /me/events/{id}`, or `DELETE /me/calendars/{cid}/events/{id}`.
 *
 * https://learn.microsoft.com/en-us/graph/api/event-delete
 *
 * Not a quiet operation: Graph documents that deleting a *meeting* from the
 * organizer's calendar sends a cancellation to every attendee. There is no flag
 * to suppress that here — deleting your own copy of someone else's meeting is a
 * decline, not a delete, and Graph models it as a separate action.
 *
 * Requires the `Calendars.ReadWrite` scope. Answers `204 No Content`.
 */
const deleteEvent: ActionDefinition<Input> = {
  key: "delete-event",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description:
    "Delete a calendar event. If it is a meeting you organize, attendees are sent a cancellation.",
  // Re-deleting a removed event reaches the same end state.
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      advanced: true,
      hint: "Only needed when the event is not on the default calendar.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const id = encodeURIComponent(input.eventId);
    const path = input.calendarId
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/events/${id}`
      : `/me/events/${id}`;

    return client.status(path, { method: "DELETE" });
  },
};

export default deleteEvent;
