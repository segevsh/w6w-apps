import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  invoiceNumber?: string;
  sortBy?: string;
  lastModified?: string;
}

const invoicePaymentList: ActionDefinition<Input> = {
  key: "invoice-payment-list",
  type: "search",
  resource: "invoice-payment",
  title: "List Invoice Payments",
  description: "List payments registered against customer invoices.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
    {
      "key": "invoiceNumber",
      "label": "Invoice number",
      "type": "string",
    },
    {
      "key": "sortBy",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "paymentdate",
          "label": "paymentdate",
        },
      ],
    },
    {
      "key": "lastModified",
      "label": "Last modified since",
      "type": "string",
      "hint": "Only records changed since this timestamp, e.g. 2026-10-01 or 2026-10-01 08:00.",
    },
  ],
  output: [
    {
      "key": "InvoicePayments",
      "type": "array",
      "label": "Invoice payments",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/invoicepayments", {
      page: input.page,
      limit: input.limit,
      invoicenumber: input.invoiceNumber,
      sortby: input.sortBy,
      lastmodified: input.lastModified,
    });
  },
};

export default invoicePaymentList;
