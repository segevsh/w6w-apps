/**
 * `GET /api/v2/venues/{id}` — one venue, with its rooms.
 *
 * `venue_type` is `physical` or `online` and `is_online` reports the same
 * distinction as a flag; `video_url_type` is `static` or `zoom`, which is what
 * decides whether `video_url` is a fixed link or a Zoom meeting — `zoom_user`
 * is present for the latter.
 *
 * `address` and `physical_address` are the two address shapes TeamUp returns
 * (`physical_address` the structured one), `venue_rooms` the rooms inside the
 * venue — what an event's `venue_room` points at — and `timezone` the zone the
 * venue's `local_*` event times are expressed in. `archived` marks a venue no
 * longer in use.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { venueOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "venues-get",
  type: "read",
  resource: "venue",
  title: "Get Venue",
  description:
    "Fetch one venue by id: its address, timezone, rooms and whether it is a physical or online " +
    "location (GET /api/v2/venues/{id}).",
  params: [
    idParam("The venue `id` from List Venues."),
    ...commonParams(),
  ],
  output: venueOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/venues/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
