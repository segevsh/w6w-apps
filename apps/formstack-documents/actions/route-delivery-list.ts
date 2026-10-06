import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * List the deliveries configured on a data route (GET /routes/{id}/deliveries).
 */
const routeDeliveryList: ActionDefinition<Input> = {
  key: "route-delivery-list",
  type: "read",
  resource: "delivery",
  title: "List Data Route Deliveries",
  description: "List the deliveries configured on a data route (GET /routes/{id}/deliveries).",
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
  ],
  output: [
    { key: "deliveries", type: "array", label: "Array of { id, type, settings }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}/deliveries`);
  },
};

export default routeDeliveryList;
