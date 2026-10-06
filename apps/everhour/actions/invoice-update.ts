import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toArray, toObject } from "../lib/client.ts";

/**
 * `PUT /invoices/{invoiceId}` — Update an invoice's number, dates, notes, tax, discount or line items.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
  publicId?: string;
  issueDate?: string;
  dueDate?: string;
  reference?: string;
  publicNotes?: string;
  tax?: unknown;
  discount?: unknown;
  invoiceItems?: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update an invoice's number, dates, notes, tax, discount or line items.",
  idempotent: true,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "Numeric invoice id (from List Invoices).",
    },
    { key: "publicId", label: "Invoice number", type: "string" },
    { key: "issueDate", label: "Issue date", type: "date" },
    { key: "dueDate", label: "Due date", type: "date" },
    { key: "reference", label: "Reference", type: "string" },
    { key: "publicNotes", label: "Public notes", type: "text" },
    { key: "tax", label: "Tax", type: "json", hint: 'JSON object `{"rate": 11, "amount": 1512}`.' },
    {
      key: "discount",
      label: "Discount",
      type: "json",
      hint: 'JSON object `{"rate": 25, "amount": 4581}`.',
    },
    {
      key: "invoiceItems",
      label: "Line items",
      type: "json",
      hint:
        "JSON array of `{id, name, billedTime, listAmount, taxable, position}`; times in seconds, amounts in cents.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}`, {
      method: "PUT",
      body: compact({
        publicId: input.publicId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        reference: input.reference,
        publicNotes: input.publicNotes,
        tax: toObject(input.tax, "tax"),
        discount: toObject(input.discount, "discount"),
        invoiceItems: toArray(input.invoiceItems, "invoiceItems"),
      }),
    });
  },
};

export default invoiceUpdate;
