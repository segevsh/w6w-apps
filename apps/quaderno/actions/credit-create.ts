import type { ActionDefinition } from "@w6w/types";
import { compact, QuadernoClient } from "../lib/client.ts";

interface Input {
  invoiceId: number;
  creditedAmount?: number;
  paymentMethod?: string;
}

const creditCreate: ActionDefinition<Input> = {
  key: "credit-create",
  type: "perform",
  resource: "credit",
  title: "Create Credit Note",
  description: "Refund an invoice by issuing a credit note against it.",
  idempotent: false,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "The invoice being refunded.",
    },
    {
      key: "creditedAmount",
      label: "Credited amount",
      type: "number",
      hint: "At most the invoice total. Only for single-item invoices; defaults to the full total.",
    },
    {
      key: "paymentMethod",
      label: "Refund method",
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
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request("/credits", {
      method: "POST",
      body: compact({
        invoice_id: input.invoiceId,
        credited_amount: input.creditedAmount,
        payment_method: input.paymentMethod,
      }),
    });
  },
};

export default creditCreate;
