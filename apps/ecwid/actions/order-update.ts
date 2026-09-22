import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId, mergeBody } from "../lib/client.ts";
import {
  extraFieldsParam,
  fulfillmentStatusOptions,
  orderIdParam,
  paymentStatusOptions,
} from "../lib/params.ts";

/**
 * `PUT /orders/{orderId}` — update an order.
 *
 * The common workflow shape is "order moved on": set `fulfillmentStatus` to
 * `SHIPPED` with a `trackingNumber`, or `paymentStatus` to `PAID`. Both are
 * exposed as single-choice selects because the update body takes one value each,
 * unlike the search filters of the same name.
 *
 * `subtotal` and `total` are documented on this endpoint too, and are
 * deliberately **not** exposed: they are the figures the store's own accounting
 * reads, and recomputing them belongs to whatever owns the sale, not to a
 * workflow step that is amending a status. Send them through `extraFields` (or
 * use Calculate Order Details first) if a workflow really needs to.
 *
 * `disableAllCustomerNotifications` is worth knowing about as it is the switch
 * that stops Ecwid emailing the customer about this change — it is reachable
 * through `extraFields` rather than typed here, because the safe default is to
 * leave it alone.
 *
 * Answers `{"updateCount": 1}`. Idempotent: the same body leaves the same state.
 */
interface Input {
  orderId: string;
  email?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  orderComments?: string;
  trackingNumber?: string;
  customerId?: number;
  privateAdminNotes?: string;
  hidden?: boolean;
  items?: unknown;
  billingPerson?: unknown;
  shippingPerson?: unknown;
  extraFields?: unknown;
}

const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description: "Update an order's statuses, comment, tracking number or addresses.",
  idempotent: true,
  params: [
    orderIdParam,
    {
      key: "email",
      label: "Customer email",
      type: "string",
      hint: "Changing this on a placed order is rarely what you want — it is exposed because the " +
        "endpoint accepts it, e.g. for correcting a typo.",
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      options: fulfillmentStatusOptions,
    },
    {
      key: "paymentStatus",
      label: "Payment status",
      type: "select",
      options: paymentStatusOptions,
    },
    {
      key: "trackingNumber",
      label: "Tracking number",
      type: "string",
      hint: "Shown to the customer on the order status page.",
    },
    {
      key: "orderComments",
      label: "Customer comment",
      type: "string",
      advanced: true,
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "number",
      validation: { integer: true, min: 0 },
      advanced: true,
      hint: "Attaches the order to an existing customer record.",
    },
    {
      key: "hidden",
      label: "Hidden",
      type: "boolean",
      advanced: true,
      hint: "Hides the order from the customer's own order history.",
    },
    {
      key: "privateAdminNotes",
      label: "Private admin notes",
      type: "string",
      advanced: true,
      hint: "Visible only to the store owner, never to the customer.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      advanced: true,
      hint:
        "Full replacement item array — the endpoint's `items` field replaces the list, so read " +
        "the order first if you mean to edit one line.",
    },
    { key: "billingPerson", label: "Billing person", type: "json", advanced: true },
    { key: "shippingPerson", label: "Shipping person", type: "json", advanced: true },
    extraFieldsParam,
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the order was updated" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      email: input.email,
      fulfillmentStatus: input.fulfillmentStatus,
      paymentStatus: input.paymentStatus,
      trackingNumber: input.trackingNumber,
      orderComments: input.orderComments,
      customerId: input.customerId,
      hidden: input.hidden,
      privateAdminNotes: input.privateAdminNotes,
      items: input.items,
      billingPerson: input.billingPerson,
      shippingPerson: input.shippingPerson,
    }, input.extraFields);
    return new EcwidClient(ctx).json(`/orders/${encodeId(input.orderId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default orderUpdate;
