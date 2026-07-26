import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";

interface Input {
  query: string;
  limit?: number;
  page?: string;
}

/**
 * Stripe's search index is eventually consistent — an object created moments
 * ago may not appear yet. For a read-after-write, retrieve by id instead.
 */
const customerSearch: ActionDefinition<Input> = {
  key: "customer-search",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description:
    "Search customers with Stripe's query language. The index lags writes by up to a minute.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "email:'jane@acme.test' AND metadata['plan']:'pro'",
      hint: "Stripe search syntax. Supported fields: email, name, phone, created, metadata.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "page",
      label: "Page cursor",
      type: "string",
      advanced: true,
      hint: "`next_page` from a previous result.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Customers" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_page", type: "string", label: "Next page cursor" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/customers/search", {
      query: { query: input.query, limit: input.limit, page: unset(input.page) },
    });
  },
};

export default customerSearch;
