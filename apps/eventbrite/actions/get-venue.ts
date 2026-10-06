import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

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
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
    { key: "capacity", type: "number", label: "Capacity" },
    { key: "age_restriction", type: "string", label: "Age restriction" },
    { key: "latitude", type: "string", label: "Latitude" },
    { key: "longitude", type: "string", label: "Longitude" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/venues/${encodeURIComponent(input.venueId)}/`);
  },
};

export default getVenue;
