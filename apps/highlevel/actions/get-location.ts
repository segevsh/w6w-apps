import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  locationId?: string;
}

const getLocation: ActionDefinition<Input> = {
  key: "get-location",
  type: "read",
  resource: "location",
  title: "Get Location",
  description: "Fetch a location's (sub-account's) details. Defaults to the connected location.",
  params: [
    {
      key: "locationId",
      label: "Location ID",
      type: "string",
      hint: "Defaults to this Connection's own location.",
    },
  ],
  output: [{ key: "location", type: "object", label: "Location" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    const locationId = input.locationId || client.locationId;
    return client.request(`/locations/${encodeURIComponent(locationId)}`);
  },
};

export default getLocation;
