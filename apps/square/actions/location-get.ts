import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

interface Input {
  locationId: string;
}

/** `GET /v2/locations/{location_id}` (RetrieveLocation). */
const locationGet: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "location",
  title: "Get Location",
  description:
    "Retrieve one business location — its address, timezone, currency, capabilities and status.",
  params: [
    {
      key: "locationId",
      label: "Location ID",
      type: "string",
      required: true,
      placeholder: "L1A2B3C4D5E6F",
      hint: 'The literal string "main" also resolves to the seller\'s main location.',
    },
  ],
  output: [
    { key: "location", type: "object", label: "Location" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(
      `/locations/${encodeURIComponent(input.locationId)}`,
    );
  },
};

export default locationGet;
