import type { ActionDefinition } from "@w6w/types";
import { HostawayClient } from "../lib/client.ts";

/**
 * List the account's amenities. Wraps `GET /v1/amenities`.
 *
 * "Response: An array of amenity objects" — the documented Amenity object is exactly
 * `{ "id": 1, "name": "Cable TV" }`, both fields required and both int/string. Static
 * account-independent reference data, so there are no query parameters to expose and no
 * filtering the API documents.
 *
 * It is here because `listingAmenities` on a listing write is an array of
 * `{ amenityId }` objects, and this is the only documented way to learn the ids.
 */
const action: ActionDefinition = {
  key: "list-amenities",
  type: "read",
  resource: "reference",
  title: "List amenities",
  description: "List the amenity ids and names Hostaway accepts on a listing.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Amenity ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(_input, ctx) {
    return await new HostawayClient(ctx).request("/amenities");
  },
};

export default action;
