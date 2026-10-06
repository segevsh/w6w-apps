import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const invoiceDeliver: ActionDefinition<Input> = {
  key: "invoice-deliver",
  type: "perform",
  resource: "invoice",
  title: "Deliver Invoice",
  description:
    "Email the invoice to the customer using the account's invoice template. The contact needs an email address.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "number", required: true },
  ],
  output: [
    { key: "delivered", type: "boolean", label: "Delivered" },
    { key: "id", type: "number", label: "Invoice ID" },
  ],

  async execute(input, ctx) {
    await new QuadernoClient(ctx).request(`/invoices/${input.id}/deliver`);
    return { delivered: true, id: input.id };
  },
};

export default invoiceDeliver;
