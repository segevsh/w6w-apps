import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  type: string;
  settings: Record<string, unknown>;
}

/**
 * Add a delivery (email, webhook, ...) to a data route (POST /routes/{id}/deliveries).
 */
const routeDeliveryCreate: ActionDefinition<Input> = {
  key: "route-delivery-create",
  type: "perform",
  resource: "delivery",
  title: "Create Data Route Delivery",
  description:
    "Add a delivery (email, webhook, ...) to a data route (POST /routes/{id}/deliveries).",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
    {
      key: "type",
      label: "Delivery type",
      type: "string",
      required: true,
      hint: "e.g. email or webhook.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      required: true,
      hint: "Delivery settings, e.g. { to, from, subject, html } for email.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Delivery ID" },
    { key: "type", type: "string", label: "Delivery type" },
    { key: "settings", type: "object", label: "Settings" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}/deliveries`, {
      method: "POST",
      body: { type: input.type, settings: input.settings },
    });
  },
};

export default routeDeliveryCreate;
