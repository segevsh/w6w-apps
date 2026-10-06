import type { ActionDefinition } from "@w6w/types";
import { compact, csv, jsonParam, QuadernoClient } from "../lib/client.ts";

interface Input {
  contactId?: number;
  contact?: unknown;
  items: unknown;
  currency?: string;
  issueDate?: string;
  poNumber?: string;
  subject?: string;
  notes?: string;
  paymentDetails?: string;
  tags?: string;
  customMetadata?: unknown;
  dueDate?: string;
  paymentMethod?: string;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    "Create an invoice. Quaderno calculates the taxes. Optionally record a full payment at creation.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      hint: "An existing contact. Give this or `Contact (new)`.",
    },
    {
      key: "contact",
      label: "Contact (new)",
      type: "json",
      hint:
        'Full contact details, e.g. `{"first_name":"Jo","email":"jo@x.io"}`. Used when no contact ID is given.',
    },
    {
      key: "items",
      label: "Line items",
      type: "json",
      required: true,
      hint:
        'Array of items, e.g. `[{"description":"Consulting","unit_price":100,"quantity":1}]`. Each needs a description and a `unit_price` or `total_amount`.',
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "3-letter ISO code. Defaults to the account currency.",
    },
    { key: "issueDate", label: "Issue date", type: "string", hint: "YYYY-MM-DD." },
    { key: "poNumber", label: "PO number", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
    { key: "paymentDetails", label: "Payment details", type: "string" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "customMetadata", label: "Custom metadata", type: "json", hint: "Key-value object." },
    { key: "dueDate", label: "Due date", type: "string", hint: "YYYY-MM-DD." },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "select",
      options: [
        { "value": "credit_card", "label": "credit_card" },
        { "value": "cash", "label": "cash" },
        { "value": "wire_transfer", "label": "wire_transfer" },
        { "value": "direct_debit", "label": "direct_debit" },
        { "value": "check", "label": "check" },
        { "value": "iou", "label": "iou" },
        { "value": "paypal", "label": "paypal" },
        { "value": "offset", "label": "offset" },
        { "value": "other", "label": "other" },
      ],
      hint: "If set, a payment for the full amount is recorded and the invoice is marked paid.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    const contact = input.contactId !== undefined
      ? { id: input.contactId }
      : jsonParam(input.contact, "contact");
    if (!contact) throw new Error("Provide either a contact ID or new contact details.");
    return new QuadernoClient(ctx).request("/invoices", {
      method: "POST",
      body: compact({
        contact,
        items: jsonParam(input.items, "items"),
        currency: input.currency,
        issue_date: input.issueDate,
        po_number: input.poNumber,
        subject: input.subject,
        notes: input.notes,
        payment_details: input.paymentDetails,
        tag_list: csv(input.tags),
        custom_metadata: jsonParam(input.customMetadata, "customMetadata"),
        due_date: input.dueDate,
        payment_method: input.paymentMethod,
      }),
    });
  },
};

export default invoiceCreate;
