import type { ActionDefinition } from "@w6w/types";
import {
  BUSINESS_INFORMATION_URL,
  GoogleBusinessProfileClient,
  locationName,
} from "../lib/client.ts";

interface Input {
  locationId: string;
  readMask?: string;
}

const DEFAULT_READ_MASK =
  "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,latlng,openInfo,profile,categories,metadata";

/**
 * `locations.get` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/get
 */
const getLocation: ActionDefinition<Input> = {
  key: "get-location",
  type: "read",
  resource: "location",
  title: "Get Location",
  description: "Retrieve a single location by ID.",
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "readMask",
      label: "Read mask",
      type: "string",
      required: true,
      default: DEFAULT_READ_MASK,
      hint: "Comma-separated list of Location field paths to return.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "title", type: "string", label: "Business name" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(BUSINESS_INFORMATION_URL, `/${locationName(input.locationId)}`, {
      query: { readMask: input.readMask ?? DEFAULT_READ_MASK },
    });
  },
};

export default getLocation;
