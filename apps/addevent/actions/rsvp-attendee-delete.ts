import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { attendeeIdParam } from "../lib/params.ts";

/**
 * `DELETE /rsvps/{attendee_id}` — permanently delete an RSVP attendee. Cannot be
 * undone. Answers `204` with no body.
 */
interface Input {
  attendeeId: string;
}

const rsvpAttendeeDelete: ActionDefinition<Input> = {
  key: "rsvp-attendee-delete",
  type: "perform",
  resource: "rsvp-attendee",
  title: "Delete RSVP Attendee",
  description: "Permanently delete an RSVP attendee by id. Cannot be undone.",
  idempotent: true,
  params: [attendeeIdParam],
  output: [
    { key: "attendeeId", type: "string", label: "Attendee deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new AddEventClient(ctx).status(
      `/rsvps/${encodeURIComponent(input.attendeeId)}`,
      { method: "DELETE" },
    );
    return { attendeeId: input.attendeeId, status };
  },
};

export default rsvpAttendeeDelete;
