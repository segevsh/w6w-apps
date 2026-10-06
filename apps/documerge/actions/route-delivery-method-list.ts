import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
}

const routeDeliveryMethodList: ActionDefinition<Input> = {
  key: "route-delivery-method-list",
  type: "search",
  resource: "delivery-method",
  title: "List Route Delivery Methods",
  description: "List where a route's merge results are delivered.",
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Delivery methods" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/delivery-methods/${encodeURIComponent(String(input.routeId))}`,
      { method: "GET" },
    );
  },
};

export default routeDeliveryMethodList;
