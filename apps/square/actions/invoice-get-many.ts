import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput, locationId } from "../lib/params.ts";

interface Input {
  locationId: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /v2/invoices` (ListInvoices).
 *
 * `location_id` is REQUIRED on this endpoint — invoices are listed per
 * location, not per seller. Run `location-get-many` first if you do not already
 * hold the id.
 */
const invoiceGetMany: ActionDefinition<Input> = {
  key: "invoice-get-many",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices for one location. Square requires the location id here.",
  params: [
    locationId(
      true,
      "Required. Invoices are scoped per location; use `location-get-many` to find it.",
    ),
    limit("Max invoices to return. Square's default is 100, maximum 200."),
    cursor,
  ],
  output: listOutput("invoices", "Invoices"),

  execute(input, ctx) {
    return new SquareClient(ctx).request("/invoices", {
      query: {
        location_id: input.locationId,
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default invoiceGetMany;
