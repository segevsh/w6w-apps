import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  deliveryMethodId: number;
}

const routeDeliveryMethodDelete: ActionDefinition<Input> = {
  key: "route-delivery-method-delete",
  type: "perform",
  resource: "delivery-method",
  title: "Delete Route Delivery Method",
  description: "Remove a delivery method from a route.",
  idempotent: true,
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
    {
      key: "deliveryMethodId",
      label: "Delivery method ID",
      type: "number",
      required: true,
      hint: "From List Delivery Methods.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/routes/delivery-methods/${encodeURIComponent(String(input.routeId))}/${
        encodeURIComponent(String(input.deliveryMethodId))
      }`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default routeDeliveryMethodDelete;
