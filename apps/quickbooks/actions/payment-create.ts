import type { ActionDefinition } from "@w6w/types";
import { jsonObject, QuickBooksClient } from "../lib/client.ts";

interface Input {
  customerId: string;
  totalAmount: number;
  additionalFields?: unknown;
}

const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description: "Record a customer payment.",
  // QuickBooks mints a new Id per call and offers no request key, so a retry
  // creates a duplicate payment.
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "totalAmount", label: "Total Amount", type: "number", required: true },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the Payment object, e.g. { "Line": [{ "Amount": 100, "LinkedTxn": [{ "TxnId": "145", "TxnType": "Invoice" }] }] } to apply the payment to a specific invoice.',
    },
  ],
  output: [{ key: "Payment", type: "object", label: "Payment" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/payment", {
      method: "POST",
      body: {
        CustomerRef: { value: input.customerId },
        TotalAmt: input.totalAmount,
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default paymentCreate;
