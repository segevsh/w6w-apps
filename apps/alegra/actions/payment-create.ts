import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, jsonArray, jsonObject, ref } from "../lib/client.ts";

interface Input {
  date: string;
  bankAccountId: string;
  paymentMethod: string;
  type?: string;
  clientId?: string;
  invoices?: unknown;
  bills?: unknown;
  observations?: string;
  anotation?: string;
  additionalFields?: unknown;
}

const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description:
    "Register a payment (incoming against sales invoices, outgoing against supplier bills).",
  idempotent: false,
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Payment date, YYYY-MM-DD.",
    },
    {
      key: "bankAccountId",
      label: "Bank account ID",
      type: "string",
      required: true,
      hint: "The bank account the money enters or leaves.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "select",
      required: true,
      options: [
        { value: "transfer", label: "Transfer" },
        { value: "cash", label: "Cash" },
        { value: "deposit", label: "Deposit" },
        { value: "check", label: "Check" },
        { value: "credit-card", label: "Credit card" },
        { value: "debit-card", label: "Debit card" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "in", label: "Incoming" }, { value: "out", label: "Outgoing" }],
    },
    { key: "clientId", label: "Client / provider ID", type: "string" },
    {
      key: "invoices",
      label: "Sales invoices paid",
      type: "json",
      hint: 'JSON array, e.g. [{"id":"6","amount":150}].',
    },
    {
      key: "bills",
      label: "Supplier bills paid",
      type: "json",
      hint: 'JSON array, e.g. [{"id":"3","amount":80}].',
    },
    { key: "observations", label: "Observations", type: "text" },
    { key: "anotation", label: "Notes (printed)", type: "text" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "JSON object merged into the body (categories, retentions, currency, costCenter, …).",
    },
  ],
  output: [{ key: "id", type: "string", label: "Payment ID" }],

  async execute(input, ctx) {
    const invoices = jsonArray(input.invoices, "invoices");
    const bills = jsonArray(input.bills, "bills");
    const client = new AlegraClient(ctx);
    return await client.request("/payments", {
      method: "POST",
      body: {
        ...compact({
          date: input.date,
          paymentMethod: input.paymentMethod,
          type: input.type,
          observations: input.observations,
          anotation: input.anotation,
          bankAccount: ref(input.bankAccountId),
          client: ref(input.clientId),
          invoices,
          bills,
        }),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default paymentCreate;
