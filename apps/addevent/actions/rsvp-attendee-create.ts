import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import {
  type AttendeeInput,
  attendeeInputBody,
  attendeeInputParams,
  eventIdParam,
} from "../lib/params.ts";
import type { AddEventAttendee } from "../lib/schema.ts";

/**
 * `POST /events/{event_id}/rsvps` — create a new RSVP attendee on an existing event.
 *
 * `email` is the only required field, and must be unique per event. By default this
 * sends NO email at all — the `notify` param opts into AddEvent's own confirmation
 * and organizer-notification emails, which otherwise only fire for RSVPs collected
 * through AddEvent's own landing page.
 */
interface Input extends AttendeeInput {
  eventId: string;
}

const rsvpAttendeeCreate: ActionDefinition<Input> = {
  key: "rsvp-attendee-create",
  type: "perform",
  resource: "rsvp-attendee",
  title: "Create RSVP Attendee",
  description: "Record an RSVP response for an event on the attendee's behalf.",
  idempotent: false,
  params: [eventIdParam, ...attendeeInputParams(true)],
  output: [
    { key: "id", type: "string", label: "Attendee ID" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "attending", type: "string", label: "Response" },
    { key: "rsvp_form_data", type: "object", label: "RSVP form answers" },
    { key: "created", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const { eventId, ...body } = input;
    return new AddEventClient(ctx).json<AddEventAttendee>(
      `/events/${encodeURIComponent(eventId)}/rsvps`,
      { method: "POST", body: attendeeInputBody(body) },
    );
  },
};

export default rsvpAttendeeCreate;
