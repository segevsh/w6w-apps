import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { listOutput, pageParam, perPageParam } from "../lib/params.ts";

/**
 * `GET /event_attendees?event_id=` — who has RSVP'd.
 *
 * `event_id` is required, and — a detail that only shows up in the parameter
 * table — it is typed **`string`** here, where the same id is `integer` on
 * `GET /events/{id}` and on the attendee write routes. The value is the same
 * number either way and the query string carries it identically, so this action
 * takes a number and lets the URL builder stringify it; the point of recording
 * the discrepancy is that a reader comparing this file against the spec will
 * notice it and should not "fix" it.
 *
 * The `event_attendee` records are a projection, not member records: each
 * carries `member_name`, `member_email`, `member_avatar_url`, `headline` and
 * `rsvp_date`, but no community-member id. Joining an attendee back to their
 * full member record means `member-search` on the address.
 */
interface Input {
  eventId: number;
  page?: number;
  perPage?: number;
}

const eventAttendeeList: ActionDefinition<Input> = {
  key: "event-attendee-list",
  type: "search",
  resource: "event-attendee",
  title: "List Event Attendees",
  description:
    "Page through an event's RSVPs. Records carry the attendee's name, email and RSVP date, " +
    "but not their member id.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/event_attendees", {
      query: { event_id: input.eventId, page: input.page, per_page: input.perPage },
    });
  },
};

export default eventAttendeeList;
