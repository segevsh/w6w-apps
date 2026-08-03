import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

/**
 * `GET /v2/locations` (ListLocations).
 *
 * The only list endpoint in this app with NO parameters and NO cursor: Square
 * returns every location a seller has in one response, because the count is
 * small by construction. Almost every other Square call is scoped by a location
 * id, so this is usually the first step of a workflow.
 */
const locationGetMany: ActionDefinition<Record<string, never>> = {
  key: "location-get-many",
  type: "search",
  resource: "location",
  title: "List Locations",
  description:
    "List every business location on the account. Unpaginated — Square returns them all at once.",
  params: [],
  output: [
    { key: "locations", type: "array", label: "Locations" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(_input, ctx) {
    return new SquareClient(ctx).request("/locations");
  },
};

export default locationGetMany;
