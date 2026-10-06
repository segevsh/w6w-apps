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
  lastModified?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List orders with Fortnox's own filters.",
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
          "value": "expired",
          "label": "expired",
        },
        {
          "value": "invoicecreated",
          "label": "invoicecreated",
        },
        {
          "value": "invoicenotcreated",
          "label": "invoicenotcreated",
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
          "value": "orderdate",
          "label": "orderdate",
        },
        {
          "value": "documentnumber",
          "label": "documentnumber",
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
      "label": "From order date",
      "type": "string",
    },
    {
      "key": "toDate",
      "label": "To order date",
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
      "key": "Orders",
      "type": "array",
      "label": "Orders",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/orders", {
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
      lastmodified: input.lastModified,
    });
  },
};

export default orderList;
