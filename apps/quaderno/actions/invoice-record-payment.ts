import type { ActionDefinition } from "@w6w/types";
import { compact, QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
  amount?: number;
  date?: string;
  paymentMethod?: string;
}

const invoiceRecordPayment: ActionDefinition<Input> = {
  key: "invoice-record-payment",
  type: "perform",
  resource: "invoice",
  title: "Record Invoice Payment",
  description: "Record a payment against an invoice.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "number", required: true },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      hint: "Paid amount, in currency units (not cents).",
    },
    { key: "date", label: "Date", type: "string", hint: "YYYY-MM-DD. Defaults to today." },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "select",
      options: [
        { "value": "credit_card", "label": "credit_card" },
        { "value": "cash", "label": "cash" },
        { "value": "wire_transfer", "label": "wire_transfer" },
        { "value": "direct_debit", "label": "direct_debit" },
        { "value": "check", "label": "check" },
        { "value": "iou", "label": "iou" },
        { "value": "paypal", "label": "paypal" },
        { "value": "other", "label": "other" },
        { "value": "credit", "label": "credit" },
        { "value": "offset", "label": "offset" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/invoices/${input.id}/payments`, {
      method: "POST",
      body: compact({
        amount: input.amount,
        date: input.date,
        payment_method: input.paymentMethod,
      }),
    });
  },
};

export default invoiceRecordPayment;
