import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  filter?: string;
  sortBy?: string;
  customerNumber?: string;
  customerName?: string;
  documentNumber?: string;
  fromDate?: string;
  toDate?: string;
  project?: string;
  ocr?: string;
  lastModified?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List customer invoices with Fortnox's own filters (status, dates, customer, project, OCR).",
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
      ],
    },
    {
      "key": "sortBy",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "customername",
          "label": "customername",
        },
        {
          "value": "customernumber",
          "label": "customernumber",
        },
        {
          "value": "documentnumber",
          "label": "documentnumber",
        },
        {
          "value": "invoicedate",
          "label": "invoicedate",
        },
        {
          "value": "ocr",
          "label": "ocr",
        },
        {
          "value": "total",
          "label": "total",
        },
      ],
    },
    {
      "key": "customerNumber",
      "label": "Customer number",
      "type": "string",
    },
    {
      "key": "customerName",
      "label": "Customer name",
      "type": "string",
    },
    {
      "key": "documentNumber",
      "label": "Document number",
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
      "key": "ocr",
      "label": "OCR",
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
      "key": "Invoices",
      "type": "array",
      "label": "Invoices",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/invoices", {
      page: input.page,
      limit: input.limit,
      filter: input.filter,
      sortby: input.sortBy,
      customernumber: input.customerNumber,
      customername: input.customerName,
      documentnumber: input.documentNumber,
      fromdate: input.fromDate,
      todate: input.toDate,
      project: input.project,
      ocr: input.ocr,
      lastmodified: input.lastModified,
    });
  },
};

export default invoiceList;
