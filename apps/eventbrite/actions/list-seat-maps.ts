import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";

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
    "List the Seat Maps of an Organization, optionally filtered by venue. The response is not paginated yet.",
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
    },
    {
      "key": "venueNameFilter",
      "label": "Venue name filter",
      "type": "string",
      "hint": "Sub-string match on venue name.",
    },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    {
      "key": "seatmaps",
      "type": "array",
      "label": "Seat maps",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/organizations/${encodeURIComponent(input.organizationId)}/seatmaps/`, {
      query: { venue_id: input.venueId, venue_name_filter: input.venueNameFilter },
    });
  },
};

export default action;
