import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /supplier_invoices/{id}` — one supplier invoice.
 *
 * Amounts, tax and currency mirror the customer side, but the state a workflow
 * reacts to differs: `payment_status` and `paid` for the money, and
 * `accounting_status` plus `reconciled` for whether the accountant has
 * validated it. `filename` and `public_file_url` point at the attached
 * document.
 */
interface Input {
  id: string;
}

const getSupplierInvoice: ActionDefinition<Input> = {
  key: "get-supplier-invoice",
  type: "read",
  resource: "supplier-invoice",
  title: "Get Supplier Invoice",
  description:
    "Fetch one supplier invoice by id, with its amounts, lines, payments and accounting status " +
    "(GET /supplier_invoices/{id}).",
  params: [idParam("Supplier invoice")],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "label", type: "string", label: "Label" },
    { key: "date", type: "string", label: "Invoice date" },
    { key: "deadline", type: "string", label: "Payment deadline" },
    { key: "payment_status", type: "string", label: "Payment status" },
    { key: "paid", type: "boolean", label: "Paid" },
    { key: "accounting_status", type: "string", label: "Accounting status" },
    { key: "reconciled", type: "boolean", label: "Reconciled" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "amount", type: "string", label: "Amount including tax" },
    { key: "tax", type: "string", label: "Tax" },
    { key: "remaining_amount_with_tax", type: "string", label: "Remaining including tax" },
    { key: "supplier", type: "object", label: "Supplier" },
    { key: "invoice_lines", type: "array", label: "Invoice lines" },
    { key: "filename", type: "string", label: "Attached file name" },
    { key: "public_file_url", type: "string", label: "Public file URL" },
    { key: "import_source", type: "string", label: "Import source" },
    { key: "payments", type: "array", label: "Payments" },
    { key: "matched_transactions", type: "array", label: "Matched bank transactions" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/supplier_invoices/${input.id}`);
  },
};

export default getSupplierInvoice;
