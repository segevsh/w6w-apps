import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  paymentMethod?: string;
  offSession?: boolean;
  paidOutOfBand?: boolean;
}

const invoicePay: ActionDefinition<Input> = {
  key: "invoice-pay",
  type: "perform",
  resource: "invoice",
  title: "Pay Invoice",
  description: "Attempt payment of an open invoice, or record that it was paid elsewhere.",
  // Idempotency-Key protects a retry from charging twice; an already-paid
  // invoice is rejected rather than re-charged.
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true, placeholder: "in_…" },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "string",
      placeholder: "pm_…",
      hint: "Defaults to the customer's default payment method.",
    },
    {
      key: "offSession",
      label: "Off session",
      type: "boolean",
      default: true,
      hint: "The customer is not present. Leave on for automated billing.",
    },
    {
      key: "paidOutOfBand",
      label: "Paid out of band",
      type: "boolean",
      hint: "Record the invoice as paid outside Stripe (bank transfer, cash) without charging.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount_paid", type: "number", label: "Amount paid" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/invoices/${encodeURIComponent(input.invoiceId)}/pay`, {
      form: {
        payment_method: unset(input.paymentMethod),
        off_session: input.offSession,
        paid_out_of_band: input.paidOutOfBand,
      },
    });
  },
};

export default invoicePay;
