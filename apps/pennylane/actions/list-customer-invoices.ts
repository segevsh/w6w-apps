import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /customer_invoices` — list customer invoices.
 *
 * The richest list in this app: Pennylane can filter on `id`, `date`,
 * `customer_id`, `billing_subscription_id`, `quote_id`, `invoice_number`,
 * `draft` (boolean), `credit_note` (boolean), `external_reference`, `flow_id`
 * and `category_id`, and can sort on `id` or `date`.
 *
 * `include=invoice_lines` expands each invoice's lines in the same response —
 * the one extra query parameter this endpoint takes beyond the shared four.
 */
interface Input extends ListInput {
  include?: string;
}

const listCustomerInvoices: ActionDefinition<Input> = {
  key: "list-customer-invoices",
  type: "read",
  resource: "customer-invoice",
  title: "List Customer Invoices",
  description:
    "List customer invoices, one cursor page at a time (GET /customer_invoices). Filterable on " +
    "id, date, customer_id, invoice_number, draft, credit_note and more.",
  params: [
    ...listParams(100),
    {
      key: "include",
      label: "Include",
      type: "string",
      advanced: true,
      placeholder: "invoice_lines",
      hint: "`invoice_lines` expands each invoice's lines inline.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Customer invoices" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/customer_invoices", {
      query: listQuery(input, { include: input.include }),
    });
  },
};

export default listCustomerInvoices;
