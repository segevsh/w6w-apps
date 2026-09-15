import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

/**
 * `GET /invoices/{invoice_id}` — fetch a single invoice.
 *
 * `invoiceId` accepts Recurly's own ID with no prefix, or the invoice number
 * prefixed `number-` (e.g. `number-1000`) — see `lib/client.ts` module doc §3.
 * A prefix-and-country-code invoice number takes both parts after `number-`
 * (Recurly's own example: `number-TEST-FR1001`).
 */
const getInvoice: ActionDefinition<Input> = {
  key: "get-invoice",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch a single invoice by Recurly ID or by number (prefixed `number-`).",
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or invoice number prefixed `number-` (`number-1000`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "number", type: "string", label: "Invoice number" },
    { key: "state", type: "string", label: "State" },
    { key: "type", type: "string", label: "charge / credit / legacy" },
    { key: "currency", type: "string", label: "Currency (ISO 4217)" },
    { key: "total", type: "number", label: "Total, in the currency's major unit" },
    { key: "balance", type: "number", label: "Amount still owed" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(`/invoices/${pathId(input.invoiceId)}`);
  },
};

export default getInvoice;
