import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  transaction_id: string;
  force?: boolean;
  request_date?: string;
}

const refundTransaction: ActionDefinition<Input> = {
  key: "refund-transaction",
  type: "perform",
  resource: "transaction",
  title: "Refund Transaction",
  description: "Refund one payment (transaction) of an order.",
  idempotent: false,
  params: [
    { key: "transaction_id", label: "Transaction ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint: "If off, refund only when the refund policy allows it.",
    },
    {
      key: "request_date",
      label: "Request date",
      type: "string",
      hint: "Apply refund policies as of this date.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "completed, refused, pending or error" },
    { key: "modified", type: "string", label: "Y if changed" },
    { key: "note", type: "string", label: "Outcome note" },
    { key: "pending_reason", type: "string", label: "Why the refund is pending" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "refundTransaction",
      compact({
        transaction_id: input.transaction_id,
        force: input.force,
        request_date: input.request_date,
      }),
      { write: true },
    );
  },
};

export default refundTransaction;
