import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

interface Input {
  query: string;
  limit?: number;
}

const customerSearch: ActionDefinition<Input> = {
  key: "customer-search",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description: "Find customers by email, name, tag or any indexed field.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "email:jane@acme.test",
      hint: "Shopify search syntax: `email:`, `phone:`, `tag:`, `country:`, or bare terms.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
  ],
  output: [{ key: "customers", type: "array", label: "Customers" }],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request("/customers/search.json", {
      query: { query: input.query, limit: input.limit },
    });
  },
};

export default customerSearch;
