import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /payouts/{id}/invoices` — Anchor operation `listPayoutInvoices`. */
interface Input {
  id: string;
}

const payoutInvoiceList: ActionDefinition<Input> = {
  key: "payout-invoice-list",
  type: "read",
  resource: "payout",
  title: "List Payout Invoices",
  description: "List the invoice charges (payments, refunds, disputes) that make up one payout.",
  params: [
    { key: "id", label: "Payout ID", type: "string", required: true },
  ],
  output: [
    { key: "entries", type: "array", label: "Invoice charges in the payout" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/payouts/${encodeId(input.id)}/invoices`);
  },
};

export default payoutInvoiceList;
