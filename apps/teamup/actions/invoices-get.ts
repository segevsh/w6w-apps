/**
 * `GET /api/v2/invoices/{id}` — one invoice, with its money.
 *
 * `status` is the same vocabulary the list filters on. `total_amount_due` is
 * what remains to be paid and `due_date` when it is due; `payer` is who the
 * document is against; `created_at` is when it was raised. `is_credit_note`
 * distinguishes a credit note from a charge, and `credit_notes` lists the
 * credit notes attached to this invoice.
 *
 * The detail is in the arrays: `charges`, `line_items`, `discounts`,
 * `adjustments`, `applied_credits` and `taxes` are each returned exactly as
 * TeamUp sends them — the reference publishes no element schema for any of
 * them, so nothing here reshapes or sums them.
 *
 * `receipt_url` is the hosted receipt a customer can be sent, and
 * `legacy_invoice_key` is TeamUp's older identifier for the same document — not
 * the `id` this action takes.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { invoiceOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "invoices-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Fetch one invoice by id: its status, due date, amount due, line items, discounts, taxes and " +
    "receipt (GET /api/v2/invoices/{id}).",
  params: [
    idParam("The invoice `id` from List Invoices."),
    ...commonParams(),
  ],
  output: invoiceOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/invoices/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
