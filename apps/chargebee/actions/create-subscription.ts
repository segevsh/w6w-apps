import type { ActionDefinition } from "@w6w/types";
import { asList, asObject, asRows, ChargebeeClient, pathId, transposeRows } from "../lib/client.ts";

interface Input {
  customerId: string;
  subscriptionItems: unknown;
  id?: string;
  startDate?: number;
  trialEnd?: number;
  billingCycles?: number;
  couponIds?: unknown;
  poNumber?: string;
  autoCollection?: string;
  paymentSourceId?: string;
  invoiceImmediately?: boolean;
  invoiceNotes?: string;
  metaData?: unknown;
}

/**
 * `POST /customers/{customer-id}/subscription_for_items` — create a subscription
 * for an existing customer.
 *
 * ## The path is not the obvious one
 *
 * Under Product Catalog 2.0 a subscription is created UNDER ITS CUSTOMER, not at
 * `/subscriptions`. `POST /subscriptions` is the Product Catalog 1.0 route and
 * does not exist in the PC 2.0 surface at all — Chargebee's own OpenAPI document
 * confirms the split: `chargebee_api_v2_pc_v1_spec` has `POST /subscriptions`
 * and no `/items`; `chargebee_api_v2_pc_v2_spec` has this path and no
 * `POST /subscriptions`. There is also no `POST /subscriptions/create_for_items`,
 * which is a plausible-looking route that simply is not in either document.
 *
 * ## Line items are columnar on the wire
 *
 * `subscription_items` is a set of PARALLEL ARRAYS correlated by index, not an
 * array of objects. Chargebee's own sample for this endpoint:
 *
 *   `-d "subscription_items[item_price_id][0]"="basic-USD"`
 *   `-d "subscription_items[billing_cycles][0]"=2`
 *   `-d "subscription_items[quantity][0]"=1`
 *   `-d "subscription_items[item_price_id][1]"="day-pass-USD"`
 *   `-d "subscription_items[unit_price][1]"=100`
 *
 * Nobody writes line items that way by hand, so this action takes the row-wise
 * form a person would write and `transposeRows` turns it into the columnar form
 * Chargebee reads. A row that omits a field leaves a hole at that index rather
 * than shifting the column — see `lib/client.ts` for why that matters.
 *
 * A subscription needs at least one PLAN item price; addon and charge item
 * prices go in the same list.
 *
 * ## Money is in the smallest currency unit
 *
 * `unit_price` is an integer in cents (or the equivalent minor unit), matching
 * the sample's `unit_price][1]"=100` for one dollar. This action passes whatever
 * you put in each row through unchanged rather than guessing at a conversion.
 *
 * Not idempotent: a retry creates a second subscription for the same customer.
 * Supply `id` to make a retry fail as a duplicate instead.
 */
const createSubscription: ActionDefinition<Input> = {
  key: "create-subscription",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description:
    "Create a subscription for an existing customer from one or more item prices. Requires a " +
    "site on Product Catalog 2.0.",
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "The subscription is created under this customer. Create the customer first.",
    },
    {
      key: "subscriptionItems",
      label: "Subscription items",
      type: "json",
      required: true,
      hint: 'Array of line items, e.g. `[{"item_price_id": "basic-USD", "quantity": 1}, ' +
        '{"item_price_id": "day-pass-USD", "unit_price": 100}]`. At least one PLAN item price is ' +
        "required; addons and charges go in the same list. Per-row keys Chargebee accepts include " +
        "`item_price_id`, `quantity`, `quantity_in_decimal`, `unit_price`, `unit_price_in_decimal`, " +
        "`billing_cycles`, `trial_end`, `service_period_days`, `charge_on_event`, `charge_once`. " +
        "Prices are integers in the currency's smallest unit (100 = $1.00).",
    },
    {
      key: "id",
      label: "Subscription ID",
      type: "string",
      hint:
        "Optional. Chargebee generates one when omitted. Supplying your own makes a retry safe.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "number",
      hint:
        "Unix epoch SECONDS. A future value creates the subscription in `future` status; a past " +
        "value backdates it.",
      validation: { integer: true },
    },
    {
      key: "trialEnd",
      label: "Trial end",
      type: "number",
      hint: "Unix epoch seconds. `0` skips the trial entirely, overriding the item price default.",
      validation: { integer: true },
    },
    {
      key: "billingCycles",
      label: "Billing cycles",
      type: "number",
      hint: "Number of cycles to run before cancelling automatically. Omit to run indefinitely.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "couponIds",
      label: "Coupon IDs",
      type: "json",
      hint:
        'Coupon ids or codes to apply, as a JSON array `["EARLYBIRD"]` or a comma-separated list. ' +
        "Sent as `coupon_ids[0]`, `coupon_ids[1]`, ...",
    },
    { key: "poNumber", label: "PO number", type: "string" },
    {
      key: "autoCollection",
      label: "Auto collection",
      type: "select",
      options: [
        { value: "on", label: "On — charge automatically" },
        { value: "off", label: "Off — invoice and collect manually" },
      ],
      hint: "Falls back to the customer's setting when omitted.",
    },
    {
      key: "paymentSourceId",
      label: "Payment source ID",
      type: "string",
      hint: "Charge a specific stored payment source instead of the customer's primary one.",
    },
    {
      key: "invoiceImmediately",
      label: "Invoice immediately",
      type: "boolean",
      hint: "Whether charges are invoiced now or held as unbilled charges.",
    },
    { key: "invoiceNotes", label: "Invoice notes", type: "text" },
    {
      key: "metaData",
      label: "Metadata",
      type: "json",
      hint: "JSON object. Sent as a single JSON-encoded `meta_data` value.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "Subscription" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice", type: "object", label: "Invoice raised, if any" },
    { key: "unbilled_charges", type: "array", label: "Unbilled charges, if any" },
  ],

  execute(input, ctx) {
    const rows = asRows(input.subscriptionItems, "Subscription items");
    if (rows.length === 0) {
      throw new Error("Subscription items must contain at least one item price");
    }

    return ChargebeeClient.fromConnection(ctx).request(
      `/customers/${pathId(input.customerId)}/subscription_for_items`,
      {
        form: {
          id: input.id,
          start_date: input.startDate,
          trial_end: input.trialEnd,
          billing_cycles: input.billingCycles,
          po_number: input.poNumber,
          auto_collection: input.autoCollection,
          payment_source_id: input.paymentSourceId,
          invoice_immediately: input.invoiceImmediately,
          invoice_notes: input.invoiceNotes,
          coupon_ids: asList(input.couponIds, "Coupon IDs"),
          subscription_items: transposeRows(rows),
          meta_data: asObject(input.metaData, "Metadata"),
        },
      },
    );
  },
};

export default createSubscription;
