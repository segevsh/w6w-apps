import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  filter?: string;
  supplierNumber?: string;
  supplierName?: string;
  invoiceNumber?: string;
  ocr?: string;
  fromDate?: string;
  toDate?: string;
  project?: string;
  lastModified?: string;
}

const supplierInvoiceList: ActionDefinition<Input> = {
  key: "supplier-invoice-list",
  type: "search",
  resource: "supplier-invoice",
  title: "List Supplier Invoices",
  description: "List supplier invoices with Fortnox's own filters.",
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
      "key": "filter",
      "label": "Status filter",
      "type": "select",
      "options": [
        {
          "value": "cancelled",
          "label": "cancelled",
        },
        {
          "value": "fullypaid",
          "label": "fullypaid",
        },
        {
          "value": "unpaid",
          "label": "unpaid",
        },
        {
          "value": "unpaidoverdue",
          "label": "unpaidoverdue",
        },
        {
          "value": "unbooked",
          "label": "unbooked",
        },
        {
          "value": "pendingpayment",
          "label": "pendingpayment",
        },
        {
          "value": "authorizepending",
          "label": "authorizepending",
        },
      ],
    },
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
    },
    {
      "key": "supplierName",
      "label": "Supplier name",
      "type": "string",
    },
    {
      "key": "invoiceNumber",
      "label": "Invoice number",
      "type": "string",
    },
    {
      "key": "ocr",
      "label": "OCR",
      "type": "string",
    },
    {
      "key": "fromDate",
      "label": "From invoice date",
      "type": "string",
    },
    {
      "key": "toDate",
      "label": "To invoice date",
      "type": "string",
    },
    {
      "key": "project",
      "label": "Project",
      "type": "string",
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
      "key": "SupplierInvoices",
      "type": "array",
      "label": "Supplier invoices",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/supplierinvoices", {
      page: input.page,
      limit: input.limit,
      filter: input.filter,
      suppliernumber: input.supplierNumber,
      suppliername: input.supplierName,
      invoicenumber: input.invoiceNumber,
      ocr: input.ocr,
      fromdate: input.fromDate,
      todate: input.toDate,
      project: input.project,
      lastmodified: input.lastModified,
    });
  },
};

export default supplierInvoiceList;
