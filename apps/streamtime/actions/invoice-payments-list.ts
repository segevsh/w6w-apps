import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /invoices/{invoice_id}/invoice_payments` — the payments and payouts
 * against an invoice.
 *
 * The route returns both directions in one list, which is why the vendor's
 * summary says "payments and payouts": `amountPaidIncTax` is the figure, and
 * the sign/origin of a row is not expressed by a type field on the model.
 */
interface Input {
  invoiceId: number;
}

const invoicePaymentsList: ActionDefinition<Input> = {
  key: "invoice-payments-list",
  type: "search",
  resource: "invoice",
  title: "List Invoice Payments",
  description: "List the payments and payouts recorded against an invoice.",
  params: [idParam("invoiceId", "Invoice ID")],
  output: [
    {
      key: "invoicePayments",
      type: "array",
      label: "Payments — `{ id, paymentDate, notes, amountPaidIncTax, invoiceId }`",
    },
  ],

  async execute(input, ctx) {
    const invoicePayments = await new StreamtimeClient(ctx).request<unknown[]>(
      `/invoices/${encodeId(input.invoiceId)}/invoice_payments`,
    );
    return { invoicePayments: invoicePayments ?? [] };
  },
};

export default invoicePaymentsList;
