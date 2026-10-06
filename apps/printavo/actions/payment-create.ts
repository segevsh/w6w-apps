import type { ActionDefinition } from "@w6w/types";
import { compact, PrintavoClient } from "../lib/client.ts";
import { PAYMENT_FIELDS } from "../lib/fields.ts";

interface Input {
  orderId: string;
  amount: number;
  category?: string;
  description?: string;
  transactionDate?: string;
}

const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Record Payment",
  description:
    "Record a payment against a quote or invoice (transactionPaymentCreate). Not idempotent: each call adds another payment.",
  idempotent: false,
  params: [
    { key: "orderId", label: "Quote or Invoice ID", type: "string", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    {
      key: "category",
      label: "Payment Type",
      type: "select",
      options: [
        { label: "Bank transfer", value: "BANK_TRANSFER" },
        { label: "Cash", value: "CASH" },
        { label: "Check", value: "CHECK" },
        { label: "Credit card", value: "CREDIT_CARD" },
        { label: "eCheck", value: "ECHECK" },
        { label: "Other", value: "OTHER" },
      ],
    },
    { key: "description", label: "Description", type: "string" },
    { key: "transactionDate", label: "Transaction Date", type: "string", hint: "ISO 8601 date." },
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ transactionPaymentCreate: unknown }>(
      `mutation($input: TransactionPaymentCreateInput!) { transactionPaymentCreate(input: $input) { ${PAYMENT_FIELDS} } }`,
      {
        input: compact({
          order: { id: input.orderId },
          amount: input.amount,
          category: input.category,
          description: input.description,
          transactionDate: input.transactionDate,
        }),
      },
    );
    return data.transactionPaymentCreate;
  },
};

export default paymentCreate;
