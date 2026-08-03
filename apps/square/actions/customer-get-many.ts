import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput } from "../lib/params.ts";

interface Input {
  sortField?: string;
  sortOrder?: string;
  count?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /v2/customers` (ListCustomers).
 *
 * Square's own caveat, carried into the hints: this endpoint is eventually
 * consistent, so a customer created seconds ago may not appear yet. Use
 * `customer-get` when you already hold the id.
 */
const customerGetMany: ActionDefinition<Input> = {
  key: "customer-get-many",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customer profiles on the account. Eventually consistent — a just-created profile may lag.",
  params: [
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      hint: "Defaults to DEFAULT, which sorts by name.",
      options: [
        { value: "DEFAULT", label: "Default (by name)" },
        { value: "CREATED_AT", label: "Created at" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      hint: "Square's default here is ASC, unlike the payments endpoints.",
      options: [
        { value: "ASC", label: "Ascending (ASC)" },
        { value: "DESC", label: "Descending (DESC)" },
      ],
    },
    {
      key: "count",
      label: "Include total count",
      type: "boolean",
      hint: "Return the account's total customer count in `count`. Defaults to false.",
    },
    limit("Max results per page, 1-100. Outside that range Square returns a 400."),
    cursor,
  ],
  output: [
    ...listOutput("customers", "Customer profiles"),
    { key: "count", type: "number", label: "Total customers (only when requested)" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request("/customers", {
      query: {
        sort_field: unset(input.sortField),
        sort_order: unset(input.sortOrder),
        count: input.count,
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default customerGetMany;
