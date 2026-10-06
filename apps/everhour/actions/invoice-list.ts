import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /invoices` — List all invoices.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List all invoices.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).many(`/invoices`);
  },
};

export default invoiceList;
