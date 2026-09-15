import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { attendeeIdParam } from "../lib/params.ts";
import type { AddEventAttendee } from "../lib/schema.ts";

/** `GET /rsvps/{attendee_id}` — retrieve one RSVP attendee object. */
interface Input {
  attendeeId: string;
}

const rsvpAttendeeRetrieve: ActionDefinition<Input> = {
  key: "rsvp-attendee-retrieve",
  type: "read",
  resource: "rsvp-attendee",
  title: "Retrieve RSVP Attendee",
  description: "Fetch one RSVP attendee by id.",
  params: [attendeeIdParam],
  output: [
    { key: "id", type: "string", label: "Attendee ID" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "attending", type: "string", label: "Response" },
    { key: "rsvp_form_data", type: "object", label: "RSVP form answers" },
    { key: "geo_location", type: "object", label: "Location at time of RSVP" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AddEventAttendee>(
      `/rsvps/${encodeURIComponent(input.attendeeId)}`,
    );
  },
};

export default rsvpAttendeeRetrieve;
