import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  type: string;
  settings: unknown;
}

const routeDeliveryMethodCreate: ActionDefinition<Input> = {
  key: "route-delivery-method-create",
  type: "perform",
  resource: "delivery-method",
  title: "Create Route Delivery Method",
  description: "Add a delivery method to a route.",
  idempotent: false,
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
    {
      key: "type",
      label: "Delivery type",
      type: "string",
      required: true,
      hint: "Delivery method type, e.g. webhook, email, dropbox.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      required: true,
      hint:
        "JSON object of settings for that delivery type; see the shape returned by List Delivery Methods.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/delivery-methods/${encodeURIComponent(String(input.routeId))}`,
      {
        method: "POST",
        body: compact({ type: input.type, settings: asObject(input.settings, "Settings") }),
      },
    );
  },
};

export default routeDeliveryMethodCreate;
