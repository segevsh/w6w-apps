import { snapshotTrigger } from "../lib/polls.ts";
import listSeatMaps from "../actions/list-seat-maps.ts";
import { SEAT_MAP_OUTPUT, SEAT_MAP_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for seat maps. `GET /organizations/{id}/seatmaps/` is documented as
 * not paginated yet ("The response is not paginated yet", `list-seat-maps`), so the whole list is
 * compared check to check; a response that says it has more is refused.
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
  }],
  input: (p) => ({ organizationId: String(p.organizationId ?? "").trim() }),
  output: SEAT_MAP_OUTPUT,
  sample: SEAT_MAP_SAMPLE,
});

export default newSeatMap;
