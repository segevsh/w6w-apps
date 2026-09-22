import type { ActionDefinition } from "@w6w/types";
import { HostawayClient } from "../lib/client.ts";

/**
 * List the property types Hostaway accepts. Wraps `GET /v1/propertyTypes`.
 *
 * "Response: An array of property type objects" — the documented Property Type Object
 * is `{ "id": 1, "name": "Apartment" }`, both fields required. Static reference data
 * with no documented query parameters and no auth-scoped filtering.
 *
 * It is here because `propertyTypeId` is a required field when creating a listing
 * (creating listings is out of this app's scope) and an updatable field on a listing
 * (see `update-listing`), and this is the only documented way to learn the ids.
 */
const action: ActionDefinition = {
  key: "list-property-types",
  type: "read",
  resource: "reference",
  title: "List property types",
  description: "List the property type ids and names Hostaway accepts on a listing.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Property type ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(_input, ctx) {
    return await new HostawayClient(ctx).request("/propertyTypes");
  },
};

export default action;
