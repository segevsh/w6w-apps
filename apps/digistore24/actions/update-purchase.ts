import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
  tracking_param?: string;
  custom?: string;
  unlock_invoices?: boolean;
  next_payment_at?: string;
}

const updatePurchase: ActionDefinition<Input> = {
  key: "update-purchase",
  type: "perform",
  resource: "purchase",
  title: "Update Purchase",
  description:
    "Change an order's tracking data, custom field, invoice access, or push out the next rebilling payment.",
  idempotent: true,
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
    {
      key: "tracking_param",
      label: "Tracking key",
      type: "string",
      hint: "The vendor's tracking key.",
    },
    { key: "custom", label: "Custom field", type: "string" },
    {
      key: "unlock_invoices",
      label: "Unlock invoices",
      type: "boolean",
      hint:
        "Re-grant the buyer access to order details and invoices (access expires after 3 years).",
    },
    {
      key: "next_payment_at",
      label: "Next payment at",
      type: "string",
      hint:
        "Postpone the next rebilling payment (e.g. 2026-12-31 12:00:00). Intervals can be extended, never shortened.",
    },
  ],
  output: [
    { key: "is_modified", type: "string", label: "Y if the purchase changed" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "updatePurchase",
      compact({
        purchase_id: input.purchase_id,
        tracking_param: input.tracking_param,
        custom: input.custom,
        unlock_invoices: input.unlock_invoices,
        next_payment_at: input.next_payment_at,
      }),
      { write: true },
    );
  },
};

export default updatePurchase;
