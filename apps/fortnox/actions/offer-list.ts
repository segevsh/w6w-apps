import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  filter?: string;
  customerNumber?: string;
  customerName?: string;
  documentNumber?: string;
  fromDate?: string;
  toDate?: string;
  project?: string;
  lastModified?: string;
}

const offerList: ActionDefinition<Input> = {
  key: "offer-list",
  type: "search",
  resource: "offer",
  title: "List Offers",
  description: "List offers (quotes) with Fortnox's own filters.",
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
          "value": "completed",
          "label": "completed",
        },
        {
          "value": "notcompleted",
          "label": "notcompleted",
        },
        {
          "value": "ordercreated",
          "label": "ordercreated",
        },
        {
          "value": "ordernotcreated",
          "label": "ordernotcreated",
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
      "label": "From offer date",
      "type": "string",
    },
    {
      "key": "toDate",
      "label": "To offer date",
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
      "key": "Offers",
      "type": "array",
      "label": "Offers",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/offers", {
      page: input.page,
      limit: input.limit,
      filter: input.filter,
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

export default offerList;
