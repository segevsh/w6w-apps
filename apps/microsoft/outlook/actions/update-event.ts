import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";
import { buildEvent, type EventInput, eventParams, scheduleParams } from "../lib/event.ts";

interface Input extends EventInput {
  eventId: string;
  calendarId?: string;
}

/**
 * `PATCH /me/events/{id}`, or `PATCH /me/calendars/{cid}/events/{id}`.
 *
 * https://learn.microsoft.com/en-us/graph/api/event-update
 *
 * Only the properties Graph lists as updatable are exposed. `transactionId` is
 * deliberately absent: it is write-once at creation and Graph rejects a change.
 *
 * Two behaviours worth knowing before wiring this into a loop, both documented:
 * an update containing only `attendees` mails a meeting update to just the
 * changed attendees, and removing an attendee who belongs to a distribution
 * list notifies *everyone*. Supplying an attendee list replaces the existing
 * one wholesale — leaving the fields empty leaves the attendees untouched.
 *
 * Requires the `Calendars.ReadWrite` scope. Answers `200 OK` with the event.
 */
const updateEvent: ActionDefinition<Input> = {
  key: "update-event",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Change properties of an existing calendar event.",
  // A PATCH converges on the same end state however many times it is applied.
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
    ...scheduleParams(false),
    ...eventParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "subject", type: "string", label: "Title" },
    { key: "start", type: "object", label: "Starts" },
    { key: "end", type: "object", label: "Ends" },
    { key: "webLink", type: "string", label: "Web link" },
  ],

  execute(input, ctx) {
    const body = buildEvent(input);
    if (Object.keys(body).length === 0) {
      throw new Error("update-event: supply at least one property to change.");
    }

    // Graph pairs start and end for validation; changing only one silently
    // produces an event whose end precedes its start.
    if ((body.start === undefined) !== (body.end === undefined)) {
      throw new Error(
        "update-event: `start` and `end` must be changed together — Microsoft Graph validates them as a pair.",
      );
    }

    const client = new GraphClient(ctx);
    const id = encodeURIComponent(input.eventId);
    const path = input.calendarId
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/events/${id}`
      : `/me/events/${id}`;

    return client.request(path, { method: "PATCH", body });
  },
};

export default updateEvent;
