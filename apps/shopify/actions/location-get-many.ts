import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

/**
 * The source of the `locationId` that `inventory-level-set` needs.
 */
const locationGetMany: ActionDefinition<Record<string, never>> = {
  key: "location-get-many",
  type: "search",
  resource: "location",
  title: "List Locations",
  description:
    "List the store's locations — the source of the location ids inventory actions need.",
  params: [],
  output: [{ key: "locations", type: "array", label: "Locations" }],

  execute(_input, ctx) {
    return new ShopifyClient(ctx).request("/locations.json");
  },
};

export default locationGetMany;
