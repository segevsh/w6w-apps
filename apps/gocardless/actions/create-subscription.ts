import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCardlessClient } from "../lib/client.ts";
import { amountParam, currencyParam, idempotencyKeyParam, metadataParam } from "../lib/params.ts";

/**
 * `POST /subscriptions` — create a recurring collection against a mandate.
 *
 * ## The cadence is described, not scheduled
 *
 * GoCardless generates every payment itself from `interval_unit` (with
 * `interval` as the multiplier, defaulting to 1), `start_date`, and — for
 * monthly and yearly cadences — `day_of_month` and `month`. That means the
 * cadence's own rules are the bank scheme's: a monthly subscription starting on
 * the 31st collects on the last day of shorter months.
 *
 * ## `count` and `end_date` bound the series
 *
 * Leave both blank and the subscription collects indefinitely until it is
 * cancelled. `count` caps the number of payments; `end_date` caps the date
 * range. Setting both is the vendor's own documented combination for a fixed
 * instalment plan.
 *
 * ## Idempotency
 *
 * Same as `create-payment`: an optional `idempotencyKey`, defaulted to this
 * step's invocation id, so a retried call returns the subscription it already
 * created instead of starting a second series. A `409
 * idempotent_creation_conflict` names the existing subscription in the error.
 */
interface Input {
  amount: number;
  currency: string;
  mandateId: string;
  intervalUnit: string;
  name?: string;
  startDate?: string;
  count?: number;
  endDate?: string;
  interval?: number;
  dayOfMonth?: number;
  month?: number;
  paymentReference?: string;
  metadata?: unknown;
  idempotencyKey?: string;
}

const createSubscription: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-subscription",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description:
    "Start a recurring collection against an active mandate. GoCardless generates each payment " +
    "from the cadence you describe here.",
  idempotent: false,
  params: [
    amountParam("Amount per payment"),
    currencyParam(true),
    {
      key: "mandateId",
      label: "Mandate ID",
      type: "string",
      required: true,
      placeholder: "MD0000…",
      hint: "The active mandate every payment in the series collects against — sent as " +
        "`links.mandate`.",
    },
    {
      key: "intervalUnit",
      label: "Interval unit",
      type: "select",
      required: true,
      options: [
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
      ],
      hint: "Sent as `interval_unit`. GoCardless's own three values — a daily cadence does not " +
        "exist in this API.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "The subscription's name, shown on the GoCardless dashboard and on the customer's " +
        "bank statement where the scheme allows.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "Sent as `start_date`: when the first collection may happen. Omit it to start as " +
        "soon as GoCardless can.",
    },
    {
      key: "count",
      label: "Number of payments",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Sent as `count`: collect exactly this many payments and then finish. Leave blank " +
        "for an open-ended subscription.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      advanced: true,
      hint: "Sent as `end_date`: the last date a payment may be collected. Leave blank for an " +
        "open-ended subscription.",
    },
    {
      key: "interval",
      label: "Interval multiplier",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Sent as `interval`. Defaults to 1; set it to 3 with a monthly unit for a quarterly " +
        "collection.",
    },
    {
      key: "dayOfMonth",
      label: "Day of month",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 31 },
      hint: "Sent as `day_of_month`, for monthly and yearly cadences. A day the month does not " +
        "have collects on the month's last day.",
    },
    {
      key: "month",
      label: "Month",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 12 },
      hint: "Sent as `month`, for yearly cadences: which month of the year to collect in.",
    },
    {
      key: "paymentReference",
      label: "Payment reference",
      type: "string",
      advanced: true,
      hint: "Sent as `payment_reference`, applied to each payment this subscription generates.",
    },
    metadataParam(),
    idempotencyKeyParam(),
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "amount", type: "number", label: "Amount per payment (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "interval_unit", type: "string", label: "Interval unit" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "links", type: "object", label: "Linked resources (mandate)" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).create(
      "subscriptions",
      "/subscriptions",
      compact({
        amount: input.amount,
        currency: input.currency,
        interval_unit: input.intervalUnit,
        name: input.name,
        start_date: input.startDate,
        count: input.count,
        end_date: input.endDate,
        interval: input.interval,
        day_of_month: input.dayOfMonth,
        month: input.month,
        payment_reference: input.paymentReference,
        metadata: asOptionalJson(input.metadata, "Metadata"),
        links: { mandate: input.mandateId },
      }),
      input.idempotencyKey,
    );
  },
};

export default createSubscription;
