import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject } from "../lib/client.ts";

interface Input {
  invoiceNumber: number;
  amount?: number;
  paymentDate?: string;
  modeOfPayment?: string;
  modeOfPaymentAccount?: number;
  additionalFields?: unknown;
}

const invoicePaymentCreate: ActionDefinition<Input> = {
  key: "invoice-payment-create",
  type: "perform",
  resource: "invoice-payment",
  title: "Create Invoice Payment",
  description: "Register a payment against a customer invoice.",
  idempotent: false,
  params: [
    {
      "key": "invoiceNumber",
      "label": "Invoice number",
      "type": "number",
      "required": true,
    },
    {
      "key": "amount",
      "label": "Amount",
      "type": "number",
    },
    {
      "key": "paymentDate",
      "label": "Payment date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "modeOfPayment",
      "label": "Mode of payment code",
      "type": "string",
    },
    {
      "key": "modeOfPaymentAccount",
      "label": "Mode of payment account",
      "type": "number",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
  ],
  output: [
    {
      "key": "InvoicePayment",
      "type": "object",
      "label": "Create Invoice Payment result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      InvoiceNumber: input.invoiceNumber,
      Amount: input.amount,
      PaymentDate: input.paymentDate,
      ModeOfPayment: input.modeOfPayment,
      ModeOfPaymentAccount: input.modeOfPaymentAccount,
    };
    return new FortnoxClient(ctx).post(
      "/3/invoicepayments",
      {
        InvoicePayment: {
          ...compact(payload),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    );
  },
};

export default invoicePaymentCreate;
