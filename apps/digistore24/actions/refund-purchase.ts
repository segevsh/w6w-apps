import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
  force?: boolean;
  request_date?: string;
}

const refundPurchase: ActionDefinition<Input> = {
  key: "refund-purchase",
  type: "perform",
  resource: "purchase",
  title: "Refund Purchase",
  description: "Refund all payments of an order that may be refunded.",
  idempotent: false,
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint:
        "If off, the refund only happens when the refund policy allows it. On = attempt it anyway.",
    },
    {
      key: "request_date",
      label: "Request date",
      type: "string",
      hint: "Apply refund policies as of this date, when processing lags the buyer's request.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Outcome" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "refundPurchase",
      compact({
        purchase_id: input.purchase_id,
        force: input.force,
        request_date: input.request_date,
      }),
      { write: true },
    );
  },
};

export default refundPurchase;
