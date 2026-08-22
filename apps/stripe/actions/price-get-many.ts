import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

interface Input {
  productId?: string;
  lookupKeys?: string;
  active?: boolean;
  type?: string;
  currency?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

/**
 * Resolve a product to its prices — the lookup a checkout flow needs, because
 * a customer subscribes to a PRICE and a product id alone cannot be checked
 * out. One product commonly holds several (monthly and annual, or one per
 * currency), so this returns a list and never pretends to return "the" price.
 *
 * `lookupKeys` is the more durable handle. A price id changes whenever an
 * amount changes — Stripe prices are immutable, so a reprice creates a NEW
 * price object — whereas a lookup key can be transferred onto the replacement
 * (`transfer_lookup_key`). Anything that stores a price id long-term is
 * storing something designed to be replaced; prefer resolving by lookup key at
 * the point of use.
 *
 * Filters `active: true` by default. Superseded prices stay in the account
 * forever and are only marked inactive, so an unfiltered list is mostly
 * history and would offer a customer a price you have stopped selling.
 */
const priceGetMany: ActionDefinition<Input> = {
  key: "price-get-many",
  type: "search",
  resource: "price",
  title: "List Prices",
  description: "Find a product's prices — by product id, or directly by lookup key.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      placeholder: "prod_…",
      hint: "Leave empty to list across all products.",
    },
    {
      key: "lookupKeys",
      label: "Lookup keys",
      type: "string",
      placeholder: "team_monthly, team_annual",
      hint:
        "Comma-separated. Survives a reprice, unlike a price id — prefer this as a stored handle.",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      default: true,
      hint: "Superseded prices stay in the account as inactive; you rarely want them.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "recurring", label: "Recurring (subscriptions)" },
        { value: "one_time", label: "One-off" },
      ],
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      advanced: true,
      hint: "Three-letter ISO code, lowercase. Empty for any.",
      validation: { pattern: "^[a-zA-Z]{3}$" },
    },
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    // Stripe takes lookup_keys as a repeated param; the client's encoder turns
    // an array into lookup_keys[0]=…&lookup_keys[1]=…
    const keys = unset(input.lookupKeys?.trim())
      ?.split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    return new StripeClient(ctx).request("/prices", {
      query: {
        product: unset(input.productId),
        lookup_keys: keys?.length ? keys : undefined,
        // Sent only when explicitly false, so the Stripe default (all) still
        // applies if the param is somehow absent rather than silently
        // narrowing a caller who never chose.
        active: input.active === undefined ? true : input.active,
        type: unset(input.type),
        currency: unset(input.currency),
        limit: input.limit,
        starting_after: unset(input.startingAfter),
        ending_before: unset(input.endingBefore),
      },
    });
  },
};

export default priceGetMany;
