import { snapshotTrigger } from "../lib/polls.ts";
import listSeatMaps from "../actions/list-seat-maps.ts";
import { SEAT_MAP_OUTPUT, SEAT_MAP_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for seat maps. `GET /organizations/{id}/seatmaps/` is documented as
 * not paginated yet ("The response is not paginated yet", `list-seat-maps`), so the whole list is
 * compared check to check; a response that says it has more is refused. The endpoint answers 400
 * (`venue_id - MISSING`) without a venue id or venue name filter (live API, 2026-11-19), so the
 * trigger takes one of them.
 * https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newSeatMap = snapshotTrigger({
  key: "new-seat-map",
  title: "New Seat Map",
  description:
    "Checks an organization's seat maps on a schedule. The run gets each seat map added since the previous check: its name, venue and capacity.",
  action: listSeatMaps,
  list: "seatmaps",
  paged: false,
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    hint: "The organization to watch.",
  }, {
    key: "venueId",
    label: "Venue ID",
    type: "string",
    hint:
      "The venue whose seat maps to watch. Set this or Venue name filter: Eventbrite requires one.",
  }, {
    key: "venueNameFilter",
    label: "Venue name filter",
    type: "string",
    hint: "Watch seat maps at venues whose name contains this text. Set this or Venue ID.",
  }],
  input: (p) => ({
    organizationId: String(p.organizationId ?? "").trim(),
    venueId: String(p.venueId ?? "").trim() || undefined,
    venueNameFilter: String(p.venueNameFilter ?? "").trim() || undefined,
  }),
  output: SEAT_MAP_OUTPUT,
  sample: SEAT_MAP_SAMPLE,
});

export default newSeatMap;
