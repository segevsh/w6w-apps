import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  billingInfoId?: string;
}

/**
 * `PUT /invoices/{invoice_id}/collect` — collect a pending or past-due,
 * automatic invoice.
 *
 * Only meaningful for `collection_method: automatic` invoices — Recurly's own
 * summary: "Collect a pending or past due, automatic invoice." A manual
 * invoice is settled by recording an external payment instead, which this app
 * does not expose.
 *
 * Not idempotent: a retry attempts a second charge against the payment
 * method. There is no supplied-id escape hatch here the way there is for
 * Create Account — treat a retry's failure mode accordingly.
 */
const collectInvoice: ActionDefinition<Input> = {
  key: "collect-invoice",
  type: "perform",
  resource: "invoice",
  title: "Collect Invoice",
  description:
    "Attempt to collect payment for a pending or past-due, automatically-collected invoice.",
  idempotent: false,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "string",
      required: true,
      hint: "Recurly ID or invoice number prefixed `number-`.",
    },
    {
      key: "billingInfoId",
      label: "Billing info ID",
      type: "string",
      hint: "Charge a specific stored billing info instead of the account's primary one. Only " +
        "available on sites with the Wallet feature.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "state", type: "string", label: "State" },
    { key: "balance", type: "number", label: "Amount still owed" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(
      `/invoices/${pathId(input.invoiceId)}/collect`,
      { method: "PUT", json: { billing_info_id: input.billingInfoId } },
    );
  },
};

export default collectInvoice;
