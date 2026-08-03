import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `DELETE /event_attendees` — cancel a member's RSVP.
 *
 * ## A DELETE with a request body
 *
 * This route reads `member_email` and `event_id` from a **JSON body**, not from
 * the query string. That is unusual — the sibling `DELETE /space_members` and
 * `DELETE /tagged_members` both use query parameters for exactly the same shape
 * of operation — and it is transcribed from this endpoint's own definition,
 * which declares a `requestBody` and no `parameters` at all.
 *
 * The distinction is not academic. A DELETE body is legal but widely dropped by
 * intermediaries, and several HTTP clients will not send one; guessing wrong in
 * either direction produces a request that reaches Circle carrying neither
 * field and fails as though the member were not attending. `lib/client.ts`
 * sends the body for any method when one is supplied, so this works — but it is
 * worth writing down that the three delete routes in this App genuinely
 * disagree with each other rather than looking inconsistent by accident.
 *
 * Idempotent: converges on "this member is not attending".
 */
interface Input {
  eventId: number;
  memberEmail: string;
}

const eventAttendeeRemove: ActionDefinition<Input> = {
  key: "event-attendee-remove",
  type: "perform",
  resource: "event-attendee",
  title: "Remove Event Attendee",
  description: "Cancel a member's RSVP to an event.",
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
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/event_attendees", {
      method: "DELETE",
      // Body, not query — this route declares a requestBody and no parameters,
      // unlike the other two delete-by-identity routes in this app.
      body: { event_id: input.eventId, member_email: input.memberEmail },
    });
  },
};

export default eventAttendeeRemove;
