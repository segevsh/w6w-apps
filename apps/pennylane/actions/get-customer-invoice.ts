import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /customer_invoices/{id}` — one customer invoice.
 *
 * Carries both the accounting figures (`amount`, `tax`, the currency pair and
 * the exchange rate) and the document state a workflow branches on: `status`,
 * `paid`, `draft`, `remaining_amount_with_tax`, plus the `customer`, lines,
 * payments, matched bank transactions and any credit note it belongs to.
 */
interface Input {
  id: string;
}

const getCustomerInvoice: ActionDefinition<Input> = {
  key: "get-customer-invoice",
  type: "read",
  resource: "customer-invoice",
  title: "Get Customer Invoice",
  description: "Fetch one customer invoice by id, with its amounts, lines, payments and status " +
    "(GET /customer_invoices/{id}).",
  params: [idParam("Customer invoice")],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "label", type: "string", label: "Label" },
    { key: "date", type: "string", label: "Invoice date" },
    { key: "deadline", type: "string", label: "Payment deadline" },
    { key: "status", type: "string", label: "Status" },
    { key: "draft", type: "boolean", label: "Draft" },
    { key: "paid", type: "boolean", label: "Paid" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "amount", type: "string", label: "Amount including tax" },
    { key: "tax", type: "string", label: "Tax" },
    { key: "remaining_amount_with_tax", type: "string", label: "Remaining including tax" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice_lines", type: "array", label: "Invoice lines" },
    { key: "payments", type: "array", label: "Payments" },
    { key: "matched_transactions", type: "array", label: "Matched bank transactions" },
    { key: "public_file_url", type: "string", label: "Public PDF URL" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/customer_invoices/${input.id}`);
  },
};

export default getCustomerInvoice;
