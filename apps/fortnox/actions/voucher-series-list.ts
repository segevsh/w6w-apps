import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
}

const voucherSeriesList: ActionDefinition<Input> = {
  key: "voucher-series-list",
  type: "read",
  resource: "voucher-series",
  title: "List Voucher Series",
  description: "List the voucher series (code, description, next number).",
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
  ],
  output: [
    {
      "key": "VoucherSeriesCollection",
      "type": "array",
      "label": "Voucher series",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/voucherseries", { page: input.page, limit: input.limit });
  },
};

export default voucherSeriesList;
