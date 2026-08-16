import type { ActionDefinition } from "@w6w/types";
import {
  BUSINESS_INFORMATION_URL,
  GoogleBusinessProfileClient,
  locationName,
} from "../lib/client.ts";

interface Input {
  locationId: string;
  attributes: unknown;
  attributeMask: string;
}

/**
 * `locations.updateAttributes` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/updateAttributes
 *
 * Attribute shape (bool / enum / url / repeated-enum value) varies per
 * attribute and is only discoverable per-location via `attributes.list`
 * (`categoryName`/`parent` filtered), so `attributes` is accepted as raw
 * JSON — an array of `Attribute` objects — rather than a fixed set of
 * fields the way `update-location` does.
 *
 * `attributeMask` must list every attribute resource name
 * (`attributes/{attribute}`) being touched: present in `attributes` with a
 * value to set/replace it, present in the mask but absent from `attributes`
 * to delete it.
 */
const updateLocationAttributes: ActionDefinition<Input> = {
  key: "update-location-attributes",
  type: "perform",
  resource: "location",
  title: "Update Location Attributes",
  description: "Set, replace, or delete attributes (e.g. amenities) on a location.",
  // Same values + same mask sent twice converge on the same end state.
  idempotent: true,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      required: true,
      hint:
        'Array of Attribute objects, e.g. [{"name":"attributes/has_wifi","values":[true]}]. An attribute named in attributeMask but omitted here is deleted.',
    },
    {
      key: "attributeMask",
      label: "Attribute mask",
      type: "string",
      required: true,
      hint: "Comma-separated attributes/{attribute} names of every attribute being set or deleted.",
    },
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
      {
        method: "PATCH",
        body: { attributes: input.attributes },
        query: { attributeMask: input.attributeMask },
      },
    );
  },
};

export default updateLocationAttributes;
