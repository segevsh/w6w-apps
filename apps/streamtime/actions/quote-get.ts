import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /quotes/{quote_id}` — one quote.
 *
 * There is no `GET /quotes` list; quote ids come from a search over `quotes`.
 * Note `createdUser` and `approvedBy` on this model are plain **strings**
 * (display names), unlike almost everywhere else in the API, where a user is an
 * object or an id.
 */
interface Input {
  quoteId: number;
}

const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description: "Fetch one quote by id — status, totals, currency and dates.",
  params: [idParam("quoteId", "Quote ID", "Ids come from a search over `quotes`.")],
  output: [
    { key: "id", type: "number", label: "Quote ID" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "quoteName", type: "string", label: "Quote name" },
    { key: "quoteNumber", type: "string", label: "Quote number" },
    { key: "quoteStatus", type: "object", label: "Status — `{ id, name }`" },
    { key: "quoteCurrencyTotalAmountExTax", type: "number", label: "Total ex tax" },
    { key: "quoteCurrencyTotalAmountIncTax", type: "number", label: "Total inc tax" },
    { key: "approvedDatetime", type: "string", label: "Approved at" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/quotes/${encodeId(input.quoteId)}`);
  },
};

export default quoteGet;
