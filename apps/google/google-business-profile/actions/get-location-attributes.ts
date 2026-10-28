import type { ActionDefinition } from "@w6w/types";
import {
  BUSINESS_INFORMATION_URL,
  GoogleBusinessProfileClient,
  locationName,
} from "../lib/client.ts";

interface Input {
  locationId: string;
}

/**
 * `locations.getAttributes` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getAttributes
 */
const getLocationAttributes: ActionDefinition<Input> = {
  key: "get-location-attributes",
  type: "read",
  resource: "location",
  title: "Get Location Attributes",
  description:
    "Retrieve the attributes (e.g. amenities, payment options) currently set on a location.",
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "attributes", type: "array", label: "Attributes" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(
      BUSINESS_INFORMATION_URL,
      `/${locationName(input.locationId)}/attributes`,
    );
  },
};

export default getLocationAttributes;
