import type { ActionDefinition } from "@w6w/types";
import { jsonArray, jsonObject, QuickBooksClient } from "../lib/client.ts";

interface Input {
  customerId: string;
  lines: unknown;
  additionalFields?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create a new invoice for a customer.",
  // QuickBooks mints a new Id per call and offers no request key, so a retry
  // creates a duplicate invoice.
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "lines",
      label: "Line items",
      type: "json",
      required: true,
      hint:
        'JSON array of QuickBooks Line objects, e.g. [{ "DetailType": "SalesItemLineDetail", "Amount": 100, "Description": "Consulting", "SalesItemLineDetail": { "ItemRef": { "value": "1" } } }].',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the Invoice object, e.g. { "DueDate": "2026-08-14", "BillEmail": { "Address": "a@b.com" } }.',
    },
  ],
  output: [{ key: "Invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request("/invoice", {
      method: "POST",
      body: {
        CustomerRef: { value: input.customerId },
        Line: jsonArray(input.lines, "lines"),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default invoiceCreate;
