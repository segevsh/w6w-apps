import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  deliveryMethodId: number;
  type: string;
  settings: unknown;
}

const routeDeliveryMethodUpdate: ActionDefinition<Input> = {
  key: "route-delivery-method-update",
  type: "perform",
  resource: "delivery-method",
  title: "Update Route Delivery Method",
  description: "Change a route delivery method's type or settings.",
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
      `/api/routes/delivery-methods/${encodeURIComponent(String(input.routeId))}/${
        encodeURIComponent(String(input.deliveryMethodId))
      }`,
      {
        method: "PUT",
        body: compact({ type: input.type, settings: asObject(input.settings, "Settings") }),
      },
    );
  },
};

export default routeDeliveryMethodUpdate;
