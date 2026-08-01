import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/**
 * List transactions. Wraps `GET /v1/reporting/transactions`.
 *
 * `startDate`/`endDate` are required by PayPal and the range they cover is
 * capped at 31 days — both enforced client-side here so a bad range fails
 * fast with a clear message instead of PayPal's generic 400.
 */
const action: ActionDefinition = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List transactions",
  description: "List transactions in a date range, from the Transaction Search API.",
  params: [
    {
      key: "startDate",
      label: "Start Date",
      type: "datetime",
      required: true,
      default: "",
      hint: "RFC 3339. The range between Start and End Date may not exceed 31 days.",
    },
    { key: "endDate", label: "End Date", type: "datetime", required: true, default: "" },
    {
      key: "transactionStatus",
      label: "Transaction Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "D", label: "Denied" },
        { value: "P", label: "Pending" },
        { value: "S", label: "Success" },
        { value: "V", label: "Reversed" },
      ],
    },
    { key: "pageSize", label: "Page Size", type: "number", default: 100 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "transaction_details", type: "array", label: "Transactions on this page" },
    { key: "total_items", type: "number", label: "Total transaction count" },
    { key: "total_pages", type: "number", label: "Total page count" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const startDate = String(p.startDate ?? "").trim();
    const endDate = String(p.endDate ?? "").trim();
    if (!startDate) throw new Error("`startDate` is required");
    if (!endDate) throw new Error("`endDate` is required");

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const days = (end.getTime() - start.getTime()) / 86_400_000;
      if (days > 31) {
        throw new Error("the range between `startDate` and `endDate` may not exceed 31 days");
      }
      if (days < 0) throw new Error("`endDate` must not be before `startDate`");
    }

    ctx.log("info", "listing PayPal transactions", { startDate, endDate });

    return await new PayPalClient(ctx).request("/v1/reporting/transactions", {
      query: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        transaction_status: p.transactionStatus ? String(p.transactionStatus) : undefined,
        page_size: Number(p.pageSize ?? 100),
        page: Number(p.page ?? 1),
      },
    });
  },
};

export default action;
