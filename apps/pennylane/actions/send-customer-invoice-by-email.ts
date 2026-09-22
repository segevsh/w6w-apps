import type { ActionDefinition } from "@w6w/types";
import { PennylaneApiError, PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /customer_invoices/{id}/send_by_email` — email a finalized invoice.
 *
 * No body. A `204` means the email is on its way.
 *
 * A `409` here is **not** the duplicate-resource 409 the rest of the API uses:
 * Pennylane documents it as "the PDF has not been generated yet" — PDF
 * generation starts when the invoice is finalized and takes a few minutes. That
 * instruction ("retry in a few minutes") is the whole point of the call's
 * failure mode, so it is appended to the thrown error rather than left as a
 * bare conflict.
 *
 * The endpoint's own warning: if the invoice falls under France's e-invoicing
 * reform, sending it by email blocks it from later transmission through an
 * approved platform, so this is only for documents outside that scope.
 */
interface Input {
  id: string;
}

const sendCustomerInvoiceByEmail: ActionDefinition<Input> = {
  key: "send-customer-invoice-by-email",
  type: "perform",
  resource: "customer-invoice",
  title: "Send Customer Invoice by Email",
  description: "Email a finalized, imported or credit-note customer invoice to the customer " +
    "(POST /customer_invoices/{id}/send_by_email). Returns 204 once the email is sent; a 409 " +
    "means the PDF is still being generated.",
  idempotent: false,
  params: [idParam("Customer invoice")],
  output: [{ key: "sent", type: "boolean", label: "Email dispatched" }],

  async execute(input, ctx) {
    try {
      await new PennylaneClient(ctx).request(`/customer_invoices/${input.id}/send_by_email`, {
        method: "POST",
      });
      return { sent: true };
    } catch (err) {
      if (err instanceof PennylaneApiError && err.status === 409) {
        throw new Error(
          `${err.message} — Pennylane documents a 409 here as the invoice's PDF not having ` +
            "been generated yet; retry in a few minutes.",
        );
      }
      throw err;
    }
  },
};

export default sendCustomerInvoiceByEmail;
