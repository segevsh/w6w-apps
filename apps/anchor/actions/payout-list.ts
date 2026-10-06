import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /payouts` — Anchor operation `listPayouts`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  qboIntegration?: string;
  xeroIntegration?: string;
  sortField?: string;
  sortDirection?: string;
}

const payoutList: ActionDefinition<Input> = {
  key: "payout-list",
  type: "search",
  resource: "payout",
  title: "List Payouts",
  description: "Page through payouts (transfers to your bank account).",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "qboIntegration",
      label: "QuickBooks sync",
      type: "select",
      options: [{ value: "synced", label: "synced" }, { value: "notSynced", label: "notSynced" }],
      hint: "Filter by QuickBooks sync state.",
    },
    {
      key: "xeroIntegration",
      label: "Xero sync",
      type: "select",
      options: [{ value: "synced", label: "synced" }, { value: "notSynced", label: "notSynced" }],
      hint: "Filter by Xero sync state.",
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: [
        { value: "payoutNumber", label: "payoutNumber" },
        { value: "depositDate", label: "depositDate" },
        { value: "amount", label: "amount" },
        { value: "status", label: "status" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/payouts", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        qboIntegration: input.qboIntegration,
        xeroIntegration: input.xeroIntegration,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
      },
    });
  },
};

export default payoutList;
