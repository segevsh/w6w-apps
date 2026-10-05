import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, Ds24Client } from "../lib/client.ts";

interface Input {
  delivery_id: number;
  notify_via_email?: boolean;
  type?: "request" | "in_progress" | "delivery" | "partial_delivery" | "return" | "cancel";
  is_shipped?: boolean;
  quantity_delivered?: number;
  add_quantity_delivered?: number;
  is_shipped_by_reseller_from?: string;
  tracking?: unknown;
}

const updateDelivery: ActionDefinition<Input> = {
  key: "update-delivery",
  type: "perform",
  resource: "delivery",
  title: "Update Delivery",
  description: "Set a delivery's status, quantity shipped and tracking information.",
  idempotent: true,
  params: [
    { key: "delivery_id", label: "Delivery ID", type: "number", required: true },
    {
      key: "notify_via_email",
      label: "Notify buyer by email",
      type: "boolean",
      hint: "Default on.",
    },
    {
      key: "type",
      label: "Status type",
      type: "select",
      options: [
        { value: "request", label: "request" },
        { value: "in_progress", label: "in_progress" },
        { value: "delivery", label: "delivery" },
        { value: "partial_delivery", label: "partial_delivery" },
        { value: "return", label: "return" },
        { value: "cancel", label: "cancel" },
      ],
    },
    {
      key: "is_shipped",
      label: "Is shipped",
      type: "boolean",
      hint: "On = shipped (type delivery); off = cancelled.",
    },
    { key: "quantity_delivered", label: "Quantity delivered", type: "number" },
    { key: "add_quantity_delivered", label: "Add to quantity delivered", type: "number" },
    { key: "is_shipped_by_reseller_from", label: "Shipped by reseller from", type: "string" },
    {
      key: "tracking",
      label: "Tracking",
      type: "json",
      hint:
        'JSON array, e.g. [{"parcel_service":"dhl","tracking_id":"123","expect_delivery_at":"2026-10-12"}].',
    },
  ],
  output: [
    { key: "is_modified", type: "string", label: "Y if the delivery changed" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "updateDelivery",
      compact({
        delivery_id: input.delivery_id,
        notify_via_email: input.notify_via_email,
        tracking: asOptionalJson(input.tracking, "Tracking"),
        data: compact({
          type: input.type,
          is_shipped: input.is_shipped,
          quantity_delivered: input.quantity_delivered,
          add_quantity_delivered: input.add_quantity_delivered,
          is_shipped_by_reseller_from: input.is_shipped_by_reseller_from,
        }),
      }),
      { write: true },
    );
  },
};

export default updateDelivery;
