import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { VENUE_OUTPUT, VENUE_SAMPLE } from "../lib/outputs.ts";

interface Input {
  venueId: string;
}

const getVenue: ActionDefinition<Input> = {
  key: "get-venue",
  type: "read",
  resource: "venue",
  title: "Get Venue",
  description: "Retrieve a venue by ID.",
  idempotent: true,
  params: [{ key: "venueId", label: "Venue ID", type: "string", required: true }],
  output: VENUE_OUTPUT,
  sample: VENUE_SAMPLE,
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/venues/${encodeURIComponent(input.venueId)}/`);
  },
};

export default getVenue;
