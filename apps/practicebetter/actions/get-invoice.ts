import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /consultant/payments/invoices/{invoiceId}` — read one invoice.
 *
 * Security: `[read]`.
 *
 * An invoice carries a family of `Money`-typed amounts — `amountDue`,
 * `amountPaid`, `amountPayable`, `amountRefunded`, `amountWrittenOff` and more.
 * They are declared in `output` as **objects**, not numbers: the document types
 * each one as the `Money` sub-object, and flattening a vendor sub-object into a
 * number here would be this app's guess about a shape it did not read.
 *
 * `alt` is an optional query parameter the document declares as a string without
 * saying what it does, so it is passed through verbatim rather than guessed at.
 */
interface Input {
  invoiceId: string;
  alt?: string;
}

const getInvoice: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-invoice",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Read one invoice by id, with its client record, consultant, currency and its due/paid/" +
    "payable/refunded/written-off amounts.",
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "string",
      required: true,
      hint: "The invoice's `id`. Use `list-invoices` to find it.",
    },
    {
      key: "alt",
      label: "Alt",
      type: "string",
      advanced: true,
      hint: "An optional string query parameter the document declares without explaining; passed " +
        "through unchanged.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "clientRecord", type: "object", label: "The client record it belongs to" },
    { key: "consultant", type: "object", label: "The consultant it belongs to" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "description", type: "string", label: "Description" },
    { key: "amountDue", type: "object", label: "Amount due (a `Money` object)" },
    { key: "amountPaid", type: "object", label: "Amount paid (a `Money` object)" },
    { key: "amountPayable", type: "object", label: "Amount payable (a `Money` object)" },
    { key: "amountRefunded", type: "object", label: "Amount refunded (a `Money` object)" },
    { key: "amountWrittenOff", type: "object", label: "Amount written off (a `Money` object)" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request(
      `/consultant/payments/invoices/${encodeId(input.invoiceId)}`,
      { query: { alt: input.alt } },
    );
  },
};

export default getInvoice;
