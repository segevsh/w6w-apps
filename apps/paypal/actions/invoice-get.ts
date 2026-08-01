import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/** Get invoice details. Wraps `GET /v2/invoicing/invoices/{id}`. */
const action: ActionDefinition = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get an invoice",
  description: "Show details for an invoice, by ID.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const invoiceId = String((input as Record<string, unknown>).invoiceId ?? "").trim();
    if (!invoiceId) throw new Error("`invoiceId` is required");
    return await new PayPalClient(ctx).request(`/v2/invoicing/invoices/${invoiceId}`);
  },
};

export default action;
