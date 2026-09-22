import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /quotes/{quote_id}/tracked_line_items` — the job items and logged
 * expenses the quote's line items are tracked against.
 *
 * The document types the 200 as a bare `object` and says only "grouped by type",
 * naming no keys. So the body is returned under a named field, unchanged — this
 * app does not invent a shape for it. Read it alongside
 * `report-setup-get`, which lists the views and columns for the same data.
 */
interface Input {
  quoteId: number;
}

const quoteTrackedLineItemsList: ActionDefinition<Input, { trackedLineItems: unknown }> = {
  key: "quote-tracked-line-items-list",
  type: "search",
  resource: "quote",
  title: "List Quote Tracked Line Items",
  description:
    "Fetch the tracked line items relating to a quote. Streamtime documents the body only as an " +
    "object grouped by type, so it is returned unchanged.",
  params: [idParam("quoteId", "Quote ID")],
  output: [
    {
      key: "trackedLineItems",
      type: "object",
      label: "The response body, grouped by type — the spec names no fields",
    },
  ],

  async execute(input, ctx) {
    const trackedLineItems = await new StreamtimeClient(ctx).request(
      `/quotes/${encodeId(input.quoteId)}/tracked_line_items`,
    );
    return { trackedLineItems: trackedLineItems ?? null };
  },
};

export default quoteTrackedLineItemsList;
