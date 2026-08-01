import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/** List invoices. Wraps `GET /v2/invoicing/invoices`. */
const action: ActionDefinition = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List invoices",
  description: "List invoices, paginated.",
  params: [
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page Size", type: "number", default: 20 },
    {
      key: "totalRequired",
      label: "Include Total Count",
      type: "boolean",
      default: false,
      hint: "Whether the response should report the total number of invoices and pages.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Invoices on this page" },
    { key: "total_items", type: "number", label: "Total invoice count (when requested)" },
    { key: "total_pages", type: "number", label: "Total page count (when requested)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new PayPalClient(ctx).request("/v2/invoicing/invoices", {
      query: {
        page: Number(p.page ?? 1),
        page_size: Number(p.pageSize ?? 20),
        total_required: p.totalRequired === true,
      },
    });
  },
};

export default action;
