import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /invoices/{invoice_id}/tracked_line_items` — what the invoice's line
 * items are tracked against.
 *
 * The document types the 200 as a bare `object` and says only "grouped by type",
 * naming no keys, so the body is returned under a named field unchanged.
 */
interface Input {
  invoiceId: number;
}

const invoiceTrackedLineItemsList: ActionDefinition<Input, { trackedLineItems: unknown }> = {
  key: "invoice-tracked-line-items-list",
  type: "search",
  resource: "invoice",
  title: "List Invoice Tracked Line Items",
  description:
    "Fetch the tracked line items relating to an invoice. Streamtime documents the body only as " +
    "an object grouped by type, so it is returned unchanged.",
  params: [idParam("invoiceId", "Invoice ID")],
  output: [
    {
      key: "trackedLineItems",
      type: "object",
      label: "The response body, grouped by type — the spec names no fields",
    },
  ],

  async execute(input, ctx) {
    const trackedLineItems = await new StreamtimeClient(ctx).request(
      `/invoices/${encodeId(input.invoiceId)}/tracked_line_items`,
    );
    return { trackedLineItems: trackedLineItems ?? null };
  },
};

export default invoiceTrackedLineItemsList;
