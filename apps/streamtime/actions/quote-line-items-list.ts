import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /quotes/{quote_id}/quote_line_items` — a quote's line items.
 *
 * `quantity` is a **string** on this model (as it is on invoice, purchase-order
 * and quote line items) while `unitRate` and `totalAmountExTax` are numbers —
 * the vendor's own typing, reproduced here rather than "fixed", because a
 * workflow that does arithmetic on it needs to know.
 */
interface Input {
  quoteId: number;
}

const quoteLineItemsList: ActionDefinition<Input> = {
  key: "quote-line-items-list",
  type: "search",
  resource: "quote",
  title: "List Quote Line Items",
  description: "List the line items on a quote.",
  params: [idParam("quoteId", "Quote ID")],
  output: [{ key: "quoteLineItems", type: "array", label: "Quote line items" }],

  async execute(input, ctx) {
    const quoteLineItems = await new StreamtimeClient(ctx).request<unknown[]>(
      `/quotes/${encodeId(input.quoteId)}/quote_line_items`,
    );
    return { quoteLineItems: quoteLineItems ?? [] };
  },
};

export default quoteLineItemsList;
