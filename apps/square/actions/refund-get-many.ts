import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput, locationId, sortOrder } from "../lib/params.ts";

interface Input {
  beginTime?: string;
  endTime?: string;
  sortField?: string;
  sortOrder?: string;
  locationId?: string;
  status?: string;
  sourceType?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /v2/refunds` (ListPaymentRefunds).
 *
 * Same one-year default window as ListPayments. Unlike ListPayments, omitting
 * the location returns refunds for ALL of the seller's locations, not just the
 * main one — Square's asymmetry, not a typo here.
 */
const refundGetMany: ActionDefinition<Input> = {
  key: "refund-get-many",
  type: "search",
  resource: "refund",
  title: "List Refunds",
  description:
    "List payment refunds across the seller's locations, newest first. Defaults to the last year.",
  params: [
    {
      key: "beginTime",
      label: "Created after",
      type: "datetime",
      hint: "RFC 3339, matched on `created_at`. Defaults to one year ago.",
    },
    {
      key: "endTime",
      label: "Created before",
      type: "datetime",
      hint: "RFC 3339. Defaults to now.",
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      hint: "Defaults to CREATED_AT.",
      options: [
        { value: "CREATED_AT", label: "Created at" },
        { value: "UPDATED_AT", label: "Updated at" },
      ],
    },
    sortOrder,
    locationId(false, "Omit to return refunds from every location."),
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Omit to return refunds in any status.",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "COMPLETED", label: "Completed" },
        { value: "REJECTED", label: "Rejected" },
        { value: "FAILED", label: "Failed" },
      ],
    },
    {
      key: "sourceType",
      label: "Payment source type",
      type: "select",
      hint: "The source type of the refunded payment.",
      options: [
        { value: "CARD", label: "Card" },
        { value: "BANK_ACCOUNT", label: "Bank account" },
        { value: "WALLET", label: "Wallet" },
        { value: "CASH", label: "Cash" },
        { value: "EXTERNAL", label: "External" },
      ],
    },
    limit("Max results per page. Default 100; values above 100 are capped at 100."),
    cursor,
  ],
  output: listOutput("refunds", "Payment refunds"),

  execute(input, ctx) {
    return new SquareClient(ctx).request("/refunds", {
      query: {
        begin_time: unset(input.beginTime),
        end_time: unset(input.endTime),
        sort_field: unset(input.sortField),
        sort_order: unset(input.sortOrder),
        location_id: unset(input.locationId),
        status: unset(input.status),
        source_type: unset(input.sourceType),
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default refundGetMany;
