import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { currency, metadataParam } from "../lib/params.ts";

interface Input {
  productId: string;
  unitAmount: number;
  currency: string;
  recurringInterval?: string;
  intervalCount?: number;
  metadata?: unknown;
}

/**
 * Prices are immutable once created — to change an amount you create a new
 * price and move subscriptions onto it. Leaving the interval empty makes it a
 * one-off price.
 */
const priceCreate: ActionDefinition<Input> = {
  key: "price-create",
  type: "perform",
  resource: "price",
  title: "Create Price",
  description:
    "Attach a price to a product. Prices are immutable — to change an amount, create a new one.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      required: true,
      placeholder: "prod_…",
    },
    {
      key: "unitAmount",
      label: "Unit amount",
      type: "number",
      required: true,
      row: "amount",
      validation: { min: 0, integer: true },
      hint: "In the smallest currency unit — 1000 = $10.00.",
    },
    currency,
    {
      key: "recurringInterval",
      label: "Billing interval",
      type: "select",
      default: "",
      options: [
        { value: "", label: "One-off" },
        { value: "day", label: "Daily" },
        { value: "week", label: "Weekly" },
        { value: "month", label: "Monthly" },
        { value: "year", label: "Yearly" },
      ],
    },
    {
      key: "intervalCount",
      label: "Interval count",
      type: "number",
      default: 1,
      showIf: { field: "recurringInterval", truthy: true },
      validation: { min: 1, integer: true },
      hint: "e.g. interval `month` with count 3 bills quarterly.",
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Price ID" },
    { key: "unit_amount", type: "number", label: "Unit amount" },
    { key: "recurring", type: "object", label: "Recurring config" },
  ],

  execute(input, ctx) {
    const interval = unset(input.recurringInterval);
    return new StripeClient(ctx).request("/prices", {
      form: {
        product: input.productId,
        unit_amount: input.unitAmount,
        currency: input.currency,
        recurring: interval ? { interval, interval_count: input.intervalCount } : undefined,
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default priceCreate;
