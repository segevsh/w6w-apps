import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { PAGINATION_OUTPUT, SEAT_MAP_OUTPUT, T5_SAMPLE } from "../lib/outputs.ts";

interface Input {
  organizationId: string;
  venueId?: string;
  venueNameFilter?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-seat-maps",
  type: "search",
  resource: "seat_map",
  title: "List Seat Maps",
  description:
    "List the Seat Maps of an Organization for a venue (by ID or name filter; Eventbrite requires one). The response is not paginated yet.",
  params: [
    {
      "key": "organizationId",
      "label": "Organization ID",
      "type": "string",
      "required": true,
      options: { source: "resolveFields" },
      config: { allowCustom: true },
    },
    {
      "key": "venueId",
      "label": "Venue ID",
      "type": "string",
      "hint": "Set this or Venue name filter: Eventbrite requires one of them.",
    },
    {
      "key": "venueNameFilter",
      "label": "Venue name filter",
      "type": "string",
      "hint":
        "Sub-string match on venue name. Set this or Venue ID: Eventbrite requires one of them.",
    },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    { key: "seatmaps", type: "array", label: "Seat maps", items: SEAT_MAP_OUTPUT },
    ...PAGINATION_OUTPUT,
  ],
  sample: T5_SAMPLE.seatMaps,
  idempotent: true,

  execute(input, ctx) {
    const venueId = input.venueId?.trim() || undefined;
    const venueNameFilter = input.venueNameFilter?.trim() || undefined;
    if (!venueId && !venueNameFilter) {
      throw new Error(
        "List Seat Maps needs a Venue ID or a Venue name filter: Eventbrite answers 400 (venue_id MISSING) without one.",
      );
    }
    const client = new EventbriteClient(ctx);
    return client.request(`/organizations/${encodeURIComponent(input.organizationId)}/seatmaps/`, {
      query: { venue_id: venueId, venue_name_filter: venueNameFilter },
    });
  },
};

export default action;
