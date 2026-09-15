import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `GET /products` — the reward catalog: gift cards, prepaid cards, cash
 * payout methods and charities, filterable by country, currency and (for
 * merchant gift cards) subcategory.
 *
 * `list-products` returns everything in one page — no `offset`/`limit`
 * parameters are documented for it.
 */
interface Input {
  country?: string;
  currency?: string;
  subcategory?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List available reward products (gift cards, prepaid cards, cash, donations).",
  params: [
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Comma-separated Alpha-2 country codes (e.g. US,GB) to only return products " +
        "available there.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "Comma-separated 3-letter currency codes (e.g. USD,EUR).",
    },
    {
      key: "subcategory",
      label: "Subcategory",
      type: "select",
      advanced: true,
      hint: "Only applies to merchant gift cards.",
      options: [
        { value: "beauty_and_health", label: "Beauty & health" },
        { value: "digital_financial_services", label: "Digital financial services" },
        { value: "electronics", label: "Electronics" },
        { value: "entertainment", label: "Entertainment" },
        { value: "fashion", label: "Fashion" },
        { value: "food_and_drink", label: "Food & drink" },
        { value: "general_merchandise", label: "General merchandise" },
        { value: "grocery_and_supermarkets", label: "Grocery & supermarkets" },
        { value: "home_and_living", label: "Home & living" },
        { value: "mobility_and_fuel", label: "Mobility & fuel" },
        { value: "sports_and_outdoor_gear", label: "Sports & outdoor gear" },
        { value: "travel_and_hospitality", label: "Travel & hospitality" },
      ],
    },
  ],
  output: [{ key: "products", type: "array", label: "Products" }],

  execute(input, ctx) {
    return new TremendousClient(ctx).json("/products", {
      query: { country: input.country, currency: input.currency, subcategory: input.subcategory },
    });
  },
};

export default productList;
