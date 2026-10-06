import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, requireAmount, required } from "../lib/client.ts";

/**
 * `POST /transfer` — moves real money out of the Paystack balance. If the account requires OTP
 * confirmation the transfer comes back `status: "otp"` and needs `/transfer/finalize_transfer`,
 * which this app does not cover.
 */
interface Input {
  amount: number;
  recipient: string;
  source?: string;
  reference?: string;
  reason?: string;
  currency?: string;
}

const transferInitiate: ActionDefinition<Input> = {
  key: "transfer-initiate",
  type: "perform",
  resource: "transfer",
  title: "Initiate Transfer",
  description:
    "Send money from the Paystack balance to a transfer recipient. Pass a unique `reference` so " +
    "a retry cannot pay twice: Paystack rejects a duplicate reference.",
  idempotent: false,
  params: [
    {
      key: "amount",
      label: "Amount (smallest unit)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "recipient", label: "Recipient code", type: "string", required: true, hint: "RCP_…" },
    {
      key: "source",
      label: "Source",
      type: "string",
      default: "balance",
      hint: "Only `balance` is supported.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "Unique, lowercase letters, digits, - and _; at least 16 characters.",
    },
    { key: "reason", label: "Reason", type: "string" },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: ["NGN", "ZAR", "KES", "GHS"].map((v) => ({ value: v, label: v })),
    },
  ],
  output: [
    { key: "transfer_code", type: "string", label: "Transfer code" },
    { key: "status", type: "string", label: "Status" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
  ],
  async execute(input, ctx) {
    return await new PaystackClient(ctx).data("/transfer", {
      method: "POST",
      body: compact({
        source: input.source || "balance",
        amount: requireAmount(input.amount),
        recipient: required(input.recipient, "Recipient code"),
        reference: input.reference,
        reason: input.reason,
        currency: input.currency,
      }),
    });
  },
};

export default transferInitiate;
