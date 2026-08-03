import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { eventOutput } from "../lib/params.ts";

/**
 * `GET /events/{id}` — one event.
 *
 * Unlike `DELETE /events/{id}`, which additionally requires a `space_id` query
 * parameter, this route takes the id alone. The asymmetry is in the endpoint
 * table, not an oversight in this file, and it is the reason `event-list` is
 * worth calling first when only an event id is known — the delete needs the
 * space and the listing is where it comes from.
 *
 * The record's timing lives in three related fields that are easy to confuse:
 * `starts_at` and `ends_at` are timestamps, while `duration_in_seconds` is what
 * the create/update API actually sets. All three are declared on the output.
 */
interface Input {
  eventId: number;
}

const eventGet: ActionDefinition<Input> = {
  key: "event-get",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch one event by numeric id, with its schedule, location and host.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      required: true,
      hint: "`event-list` returns the ids — and the `space` each event belongs to, which the " +
        "delete route needs.",
      validation: { integer: true },
    },
  ],
  output: eventOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(`/events/${encodeURIComponent(String(input.eventId))}`);
  },
};

export default eventGet;
