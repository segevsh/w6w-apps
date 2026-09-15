import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  invoiceId: number;
}

/**
 * `GET /invoices/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Returns the
 * full invoice, including line items, payments and reminders.
 */
const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch a single invoice by ID, including line items, payments and reminders.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "title", type: "string", label: "Title" },
    { key: "currency", type: "string", label: "Currency" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/invoices/${input.invoiceId}`);
  },
};

export default invoiceGet;
