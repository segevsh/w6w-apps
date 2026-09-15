import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import {
  attendeeIdParam,
  type AttendeeInput,
  attendeeInputBody,
  attendeeInputParams,
} from "../lib/params.ts";
import type { AddEventAttendee } from "../lib/schema.ts";

/**
 * `PATCH /rsvps/{attendee_id}` — update an RSVP attendee. Only the fields provided
 * are changed; anything omitted is left unchanged.
 */
interface Input extends AttendeeInput {
  attendeeId: string;
}

const rsvpAttendeeUpdate: ActionDefinition<Input> = {
  key: "rsvp-attendee-update",
  type: "perform",
  resource: "rsvp-attendee",
  title: "Update RSVP Attendee",
  description: "Update an RSVP attendee. Only the fields you set are changed; everything else " +
    "is left as-is.",
  idempotent: true,
  params: [attendeeIdParam, ...attendeeInputParams(false)],
  output: [
    { key: "id", type: "string", label: "Attendee ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "attending", type: "string", label: "Response" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    const { attendeeId, ...body } = input;
    return new AddEventClient(ctx).json<AddEventAttendee>(
      `/rsvps/${encodeURIComponent(attendeeId)}`,
      { method: "PATCH", body: attendeeInputBody(body) },
    );
  },
};

export default rsvpAttendeeUpdate;
