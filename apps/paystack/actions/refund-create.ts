import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, required } from "../lib/client.ts";

/** `POST /refund`. Omitting `amount` refunds the whole transaction. */
interface Input {
  transaction: string;
  amount?: number;
  currency?: string;
  customerNote?: string;
  merchantNote?: string;
}

const refundCreate: ActionDefinition<Input> = {
  key: "refund-create",
  type: "perform",
  resource: "refund",
  title: "Create Refund",
  description:
    "Refund a successful transaction, in full or in part. Moves money back to the customer.",
  idempotent: false,
  params: [
    {
      key: "transaction",
      label: "Transaction",
      type: "string",
      required: true,
      hint: "Transaction reference or numeric id.",
    },
    {
      key: "amount",
      label: "Amount (smallest unit)",
      type: "number",
      hint: "Leave empty to refund the full amount.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: ["NGN", "GHS", "KES", "USD", "ZAR"].map((v) => ({ value: v, label: v })),
    },
    { key: "customerNote", label: "Customer note", type: "string" },
    { key: "merchantNote", label: "Merchant note", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Refund id" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "transaction", type: "object", label: "Transaction" },
  ],
  async execute(input, ctx) {
    if (input.amount !== undefined && input.amount !== null && String(input.amount) !== "") {
      if (!Number.isInteger(Number(input.amount)) || Number(input.amount) <= 0) {
        throw new Error("Amount must be a positive whole number in the currency's smallest unit");
      }
    }
    return await new PaystackClient(ctx).data("/refund", {
      method: "POST",
      body: compact({
        transaction: required(input.transaction, "Transaction"),
        amount: input.amount,
        currency: input.currency,
        customer_note: input.customerNote,
        merchant_note: input.merchantNote,
      }),
    });
  },
};

export default refundCreate;
