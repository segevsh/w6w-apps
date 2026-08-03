import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `POST /event_attendees` — RSVP a member to an event on their behalf.
 *
 * Keyed by `member_email` and `event_id`, in a JSON body. Like the space
 * membership routes, this one identifies the person by address rather than by
 * member id — and note the field is `member_email` here where the space routes
 * call theirs plain `email`. Neither name is guessable from the other; both are
 * transcribed from their own schema.
 *
 * Neither field is marked required in the schema, which is almost certainly an
 * omission on Circle's side rather than a real optionality — an RSVP with no
 * event and no member is not an operation. Both are required here. That is a
 * deliberate divergence from the spec in the safe direction: making them
 * optional would let a workflow spend a metered request on a call that cannot
 * succeed, and Circle counts the resulting 4xx against the community's monthly
 * allowance.
 *
 * Idempotent: the endpoint converges on "this member is attending". A second
 * call does not produce a second RSVP.
 */
interface Input {
  eventId: number;
  memberEmail: string;
}

const eventAttendeeAdd: ActionDefinition<Input> = {
  key: "event-attendee-add",
  type: "perform",
  resource: "event-attendee",
  title: "Add Event Attendee",
  description: "RSVP a member to an event by email address.",
  idempotent: true,
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "memberEmail",
      label: "Member email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
      hint: "This route calls the field `member_email` — the space-membership routes call theirs " +
        "`email`. Same idea, different spelling.",
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/event_attendees", {
      method: "POST",
      body: { event_id: input.eventId, member_email: input.memberEmail },
    });
  },
};

export default eventAttendeeAdd;
