import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput, locationId, sortOrder } from "../lib/params.ts";

interface Input {
  beginTime?: string;
  endTime?: string;
  sortField?: string;
  sortOrder?: string;
  locationId?: string;
  total?: number;
  last4?: string;
  cardBrand?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /v2/payments` (ListPayments).
 *
 * Note the default window: with no `begin_time`, Square searches back exactly
 * one year, not all time. A workflow reconciling older data must say so.
 */
const paymentGetMany: ActionDefinition<Input> = {
  key: "payment-get-many",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description:
    "List payments taken by the seller, newest first. Defaults to the last year of the default location.",
  params: [
    {
      key: "beginTime",
      label: "Created after",
      type: "datetime",
      hint: "RFC 3339. Inclusive, matched on `created_at`. Defaults to one year ago.",
    },
    {
      key: "endTime",
      label: "Created before",
      type: "datetime",
      hint: "RFC 3339, matched on `created_at`. Defaults to now.",
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      hint: "Defaults to CREATED_AT.",
      options: [
        { value: "CREATED_AT", label: "Created at" },
        { value: "UPDATED_AT", label: "Updated at" },
        { value: "OFFLINE_CREATED_AT", label: "Offline created at" },
      ],
    },
    sortOrder,
    locationId(false, "Defaults to the seller's main location — not all locations."),
    {
      key: "total",
      label: "Exact total",
      type: "number",
      hint: "Matches `total_money.amount` exactly, in minor units.",
      validation: { min: 0, integer: true },
    },
    {
      key: "last4",
      label: "Card last 4",
      type: "string",
      validation: { pattern: "^[0-9]{4}$" },
    },
    { key: "cardBrand", label: "Card brand", type: "string", placeholder: "VISA" },
    limit("Max results per page. Default and maximum are both 100."),
    cursor,
  ],
  output: listOutput("payments", "Payments"),

  execute(input, ctx) {
    return new SquareClient(ctx).request("/payments", {
      query: {
        begin_time: unset(input.beginTime),
        end_time: unset(input.endTime),
        sort_field: unset(input.sortField),
        sort_order: unset(input.sortOrder),
        location_id: unset(input.locationId),
        total: input.total,
        last_4: unset(input.last4),
        card_brand: unset(input.cardBrand),
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default paymentGetMany;
