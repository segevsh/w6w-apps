import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import {
  cursorParam,
  modifiedParams,
  modifiedWindow,
  options,
  paginationOutput,
} from "../lib/params.ts";

/**
 * `GET /1.0/commerce/orders` — up to 50 orders, ordered by `modifiedOn`.
 *
 * Three request-shape rules the vendor states, all enforced before the call so
 * the failure is a readable message rather than a `400`:
 *
 *  - `modifiedAfter` and `modifiedBefore` are **required together**.
 *  - That pair **cannot be combined with `cursor`** — a date window and a
 *    cursor are two different ways to walk the same ordered list.
 *  - `paymentStates`, when omitted, is *not* "no filter": the vendor defaults
 *    it server-side to `NOT_CHARGED,AUTHORIZED,PAID,REFUNDED`, so an unfiltered
 *    list silently hides `PENDING`, `FAILED` and the refund-error states. The
 *    hint says so, because a workflow reconciling failed payments will get an
 *    empty page and blame itself.
 */
export interface OrderListResponse {
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
  result?: Array<Record<string, unknown>>;
}

const FULFILLMENT_STATUSES = ["PENDING", "FULFILLED", "CANCELED"] as const;

const PAYMENT_STATES = [
  "NOT_CHARGED",
  "AUTHORIZED",
  "PAID",
  "REFUNDED",
  "PENDING",
  "FAILED",
  "REFUND_PENDING",
  "REFUND_FAILED",
  "PARTIALLY_PAID",
] as const;

interface Input {
  cursor?: string;
  customerId?: string;
  fulfillmentStatus?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  paymentStates?: string[];
}

const listOrders: ActionDefinition<Input, OrderListResponse> = {
  key: "list-orders",
  type: "search",
  resource: "order",
  title: "List Orders",
  description:
    "List up to 50 orders for the website, ordered by modified date. Filter by customer, " +
    "fulfillment status, payment state, or a modified-date window.",
  params: [
    cursorParam(),
    ...modifiedParams(),
    {
      key: "customerId",
      label: "Customer id",
      type: "string",
      advanced: true,
      hint: "Only orders placed by this profile id (see List profiles).",
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      advanced: true,
      options: options(FULFILLMENT_STATUSES),
    },
    {
      key: "paymentStates",
      label: "Payment states",
      type: "multiselect",
      advanced: true,
      options: options(PAYMENT_STATES),
      hint: "Sent as one comma-separated value. When omitted, Squarespace defaults the filter " +
        "to `NOT_CHARGED,AUTHORIZED,PAID,REFUNDED` — so `PENDING`, `FAILED` and the " +
        "refund-error states are hidden until you ask for them explicitly.",
    },
  ],
  output: [paginationOutput, {
    key: "result",
    type: "array",
    label: "Orders (up to 50, ordered by `modifiedOn`)",
  }],

  execute(input, ctx) {
    const cursor = input.cursor?.trim() || undefined;
    const { modifiedAfter, modifiedBefore } = modifiedWindow(input, cursor !== undefined);
    const paymentStates = input.paymentStates?.filter(Boolean) ?? [];
    return new SquarespaceClient(ctx).get<OrderListResponse>(`${API_V1}/commerce/orders`, {
      cursor,
      modifiedAfter,
      modifiedBefore,
      customerId: input.customerId,
      fulfillmentStatus: input.fulfillmentStatus,
      paymentStates: paymentStates.length > 0 ? paymentStates.join(",") : undefined,
    });
  },
};

export default listOrders;
