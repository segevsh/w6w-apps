import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const invoiceGet: ActionDefinition<{ invoiceId: string }> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve an invoice by id.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true, placeholder: "in_…" },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount_due", type: "number", label: "Amount due" },
    { key: "amount_paid", type: "number", label: "Amount paid" },
    { key: "hosted_invoice_url", type: "string", label: "Hosted invoice URL" },
    { key: "invoice_pdf", type: "string", label: "PDF URL" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/invoices/${encodeURIComponent(input.invoiceId)}`);
  },
};

export default invoiceGet;
