/**
 * `GET /api/v2/events/{id}` — one event.
 *
 * The Event object in full: `name`, `description`, `starts_at`/`ends_at`,
 * `status` (`active`/`cancelled`), the occupancy numbers (`max_occupancy`,
 * `waitlist_max_override`, `attending_count`, `waiting_count`, `is_full`), and
 * the registration window (`registrations_open_at`,
 * `registrations_close_at`, `late_cancel_deadline`,
 * `active_registration_status`, `overriden_registration_timelines` — TeamUp's
 * own spelling).
 *
 * `venue`, `venue_room`, `instructors`, `offering_type` and `category` are the
 * records the event hangs off; `is_appointment` separates a one-to-one
 * appointment from a class; `schedule_type` is passed through as TeamUp sends
 * it. `customer_url` and `provider_url` are the two ways into the same event
 * in TeamUp's own web app.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { eventOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "events-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description:
    "Fetch one event by id: the schedule entry, its registration window, occupancy and instructors " +
    "(GET /api/v2/events/{id}).",
  params: [
    idParam("The event `id` from List Events or Create Event."),
    ...commonParams(),
  ],
  output: eventOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/events/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
