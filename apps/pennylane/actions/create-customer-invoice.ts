import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { compact } from "../lib/params.ts";

/**
 * `POST /customer_invoices` — create a customer invoice.
 *
 * The vendor's request body is an `anyOf` between two shapes that differ in one
 * field. Both require `date`, `deadline`, `customer_id` and `invoice_lines`:
 *
 *   - **Draft** additionally requires `draft: true` — the invoice exists but its
 *     number is not assigned and its lines stay editable.
 *   - **Finalized** omits `draft` entirely (it is *not* `draft: false`) — the
 *     invoice is numbered and locked, and a PDF is generated asynchronously.
 *
 * So `draft` is collected here with a `true` default (the safe direction: a
 * draft can still be finalized, a finalized invoice cannot be edited) and is
 * only ever put on the wire when it is true.
 *
 * `invoice_lines` is taken as a JSON array rather than modelled field by field,
 * the same pragmatic call `apps/asana/actions/create-task.ts` makes for
 * `custom_fields`: the vendor's element schema is a `oneOf` of a product-based
 * line (`{ "product_id": …, …overrides }`) and a freeform one
 * (`{ "label", "raw_currency_unit_price", "vat_rate", … }`), and a half-modelled
 * union would reject lines the API accepts.
 *
 * The `201` body is the created invoice; `id` is what gets, updates and
 * `send-customer-invoice-by-email` take.
 */
interface Input {
  date: string;
  deadline: string;
  customer_id: number;
  invoice_lines: unknown;
  draft?: boolean;
  customer_invoice_template_id?: number;
  pdf_invoice_free_text?: string;
  pdf_invoice_subject?: string;
  pdf_description?: string;
  currency?: string;
  label?: string;
  external_reference?: string;
  purchase_order_reference?: string;
  sales_order_reference?: string;
}

const createCustomerInvoice: ActionDefinition<Input> = {
  key: "create-customer-invoice",
  type: "perform",
  resource: "customer-invoice",
  title: "Create Customer Invoice",
  description:
    "Create a draft or finalized customer invoice from its date, deadline, customer and lines " +
    "(POST /customer_invoices).",
  idempotent: false,
  params: [
    { key: "date", label: "Invoice date", type: "date", required: true, hint: "ISO 8601 date." },
    {
      key: "deadline",
      label: "Payment deadline",
      type: "date",
      required: true,
      hint: "ISO 8601 date. Pennylane does not derive it from the customer's payment conditions.",
    },
    { key: "customer_id", label: "Customer ID", type: "number", required: true },
    {
      key: "invoice_lines",
      label: "Invoice lines",
      type: "json",
      required: true,
      hint: 'Array of lines. Product-based: `{ "product_id": 42, "quantity": "2" }` (price, VAT ' +
        "rate and unit are auto-filled from the product unless overridden); standard: " +
        '`{ "label": "Consulting", "raw_currency_unit_price": "100.00", "unit": "hour", ' +
        '"vat_rate": "FR_200", "quantity": "1" }`. Both require `quantity`.',
    },
    {
      key: "draft",
      label: "Draft",
      type: "boolean",
      default: true,
      hint: "Leave on to create an editable draft; turn off to finalize (number and lock) it now.",
    },
    {
      key: "customer_invoice_template_id",
      label: "Invoice template ID",
      type: "number",
      advanced: true,
    },
    {
      key: "pdf_invoice_free_text",
      label: "PDF free text",
      type: "text",
      advanced: true,
      hint: "For example, the contact details of the person to contact.",
    },
    { key: "pdf_invoice_subject", label: "PDF subject", type: "string", advanced: true },
    {
      key: "pdf_description",
      label: "PDF description",
      type: "text",
      advanced: true,
      hint: "Maximum 5,000 characters.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      advanced: true,
      placeholder: "EUR",
      hint: "ISO 4217 code, e.g. EUR, USD, GBP, CHF. Defaults to EUR.",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      advanced: true,
      hint: "Used on the accounting (ledger) entries. Defaults to the invoice number.",
    },
    { key: "external_reference", label: "External reference", type: "string", advanced: true },
    {
      key: "purchase_order_reference",
      label: "Purchase order reference",
      type: "string",
      advanced: true,
      hint: "Buyer's reference (e-invoice field BT-13). Maximum 50 characters.",
    },
    {
      key: "sales_order_reference",
      label: "Sales order reference",
      type: "string",
      advanced: true,
      hint: "Seller's reference (e-invoice field BT-14). Maximum 50 characters.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "date", type: "string", label: "Invoice date" },
    { key: "deadline", type: "string", label: "Payment deadline" },
    { key: "draft", type: "boolean", label: "Draft" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "amount", type: "string", label: "Amount including tax" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice_lines", type: "array", label: "Invoice lines" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    const { draft, ...rest } = input;
    const body = compact(rest);
    // The Draft variant is the one that requires the flag; the Finalized variant
    // is expressed by the key's ABSENCE, so `false` must never be sent.
    if (draft === true) body.draft = true;
    return new PennylaneClient(ctx).request("/customer_invoices", { method: "POST", body });
  },
};

export default createCustomerInvoice;
