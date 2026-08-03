import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  lineItemsLimit?: number;
  lineItemsOffset?: string;
}

/**
 * `GET /invoices/{invoice-id}` — retrieve one invoice.
 *
 * This is the only retrieve endpoint in this App that takes query parameters,
 * and they are worth exposing: an invoice's line items are paginated
 * INDEPENDENTLY of the invoice, via `line_items_limit` and `line_items_offset`.
 * A large consolidated invoice will otherwise come back with its line items
 * truncated and nothing in the payload saying so.
 *
 * The response is `{ invoice }` — no customer is bundled here, unlike the
 * subscription retrieve.
 */
const getInvoice: ActionDefinition<Input> = {
  key: "get-invoice",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Retrieve a single invoice by id, with control over how many of its line items come back.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "lineItemsLimit",
      label: "Line items limit",
      type: "number",
      hint: "Line items are paginated separately from the invoice. Raise this for a large " +
        "consolidated invoice.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "lineItemsOffset",
      label: "Line items offset",
      type: "string",
      hint: "Opaque cursor for the next page of line items.",
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(`/invoices/${pathId(input.invoiceId)}`, {
      query: {
        line_items_limit: input.lineItemsLimit,
        line_items_offset: input.lineItemsOffset,
      },
    });
  },
};

export default getInvoice;
