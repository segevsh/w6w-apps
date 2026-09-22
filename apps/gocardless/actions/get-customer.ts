import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `GET /customers/{id}` — one customer.
 *
 * The read that pairs with `create-customer`: it returns the customer's address,
 * contact details and `metadata` as GoCardless stored them, plus the
 * `created_at` timestamp a workflow needs for reconciliation. The customer's
 * mandates are not embedded here — use `list-mandates` with the `customer`
 * filter.
 */
interface Input {
  customerId: string;
}

const getCustomer: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by its GoCardless id.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "CU0000…",
      hint: "GoCardless's own customer id, as returned by `create-customer` or `list-customers`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "given_name", type: "string", label: "Given name" },
    { key: "family_name", type: "string", label: "Family name" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "country_code", type: "string", label: "Country code" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).one("customers", `/customers/${encodeId(input.customerId)}`);
  },
};

export default getCustomer;
