import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  financialYear?: string;
  voucherSeries?: string;
  fromDate?: string;
  toDate?: string;
  costCenter?: string;
  lastModified?: string;
}

const voucherList: ActionDefinition<Input> = {
  key: "voucher-list",
  type: "search",
  resource: "voucher",
  title: "List Vouchers",
  description: "List vouchers (ledger entries) in a financial year.",
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
      "key": "financialYear",
      "label": "Financial year id",
      "type": "string",
    },
    {
      "key": "voucherSeries",
      "label": "Voucher series",
      "type": "string",
    },
    {
      "key": "fromDate",
      "label": "From date",
      "type": "string",
    },
    {
      "key": "toDate",
      "label": "To date",
      "type": "string",
    },
    {
      "key": "costCenter",
      "label": "Cost center",
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
      "key": "Vouchers",
      "type": "array",
      "label": "Vouchers",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/vouchers", {
      page: input.page,
      limit: input.limit,
      financialyear: input.financialYear,
      voucherseries: input.voucherSeries,
      fromdate: input.fromDate,
      todate: input.toDate,
      costcenter: input.costCenter,
      lastmodified: input.lastModified,
    });
  },
};

export default voucherList;
