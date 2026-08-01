import type { ActionDefinition } from "@w6w/types";
import { jsonArray, jsonObject, XeroClient } from "../lib/client.ts";

interface Input {
  type: "ACCREC" | "ACCPAY";
  contactId: string;
  lineItems: unknown;
  additionalFields?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create a sales (ACCREC) or purchase (ACCPAY) invoice.",
  // Xero mints a new InvoiceID per call and offers no request key, so a retry
  // creates a duplicate invoice.
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "ACCREC", label: "Sales invoice (ACCREC)" },
        { value: "ACCPAY", label: "Purchase bill (ACCPAY)" },
      ],
    },
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      required: true,
      hint:
        'JSON array of Xero LineItem objects, e.g. [{ "Description": "Consulting", "Quantity": 1, "UnitAmount": 100, "AccountCode": "200" }].',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the Invoice object, e.g. { "Date": "2026-07-31", "DueDate": "2026-08-14", "Reference": "PO-42", "Status": "AUTHORISED" }.',
    },
  ],
  output: [{ key: "Invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Invoices", {
      method: "POST",
      body: {
        Invoices: [
          {
            Type: input.type,
            Contact: { ContactID: input.contactId },
            LineItems: jsonArray(input.lineItems, "lineItems"),
            ...jsonObject(input.additionalFields, "additionalFields"),
          },
        ],
      },
    });
  },
};

export default invoiceCreate;
