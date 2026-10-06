import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/selections.ts";

interface Input {
  customerId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phoneNumber?: string;
  createdFrom?: string;
  createdTo?: string;
  first?: number;
  after?: string;
}

/** Build `CustomerSearchInput`; text fields match exactly (`is`). */
export function searchInput(input: Input): Record<string, unknown> {
  const is = (v?: string) => (v ? { is: v } : undefined);
  const created = compact({
    greaterThanOrEqualTo: input.createdFrom,
    lessThanOrEqualTo: input.createdTo,
  });
  return compact({
    id: is(input.customerId),
    email: is(input.email),
    firstName: is(input.firstName),
    lastName: is(input.lastName),
    company: is(input.company),
    phoneNumber: is(input.phoneNumber),
    createdAt: Object.keys(created).length ? created : undefined,
  });
}

/** `customers(input, first, after)` — a Relay connection. */
const customerSearch: ActionDefinition<Input> = {
  key: "customer-search",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description:
    "Find customers by ID, email, name, company, phone or creation time (exact match), one page at a time.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "email", label: "Email (exact)", type: "string" },
    { key: "firstName", label: "First name (exact)", type: "string" },
    { key: "lastName", label: "Last name (exact)", type: "string" },
    { key: "company", label: "Company (exact)", type: "string" },
    { key: "phoneNumber", label: "Phone (exact)", type: "string" },
    { key: "createdFrom", label: "Created at or after", type: "datetime" },
    { key: "createdTo", label: "Created at or before", type: "datetime" },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 20,
      validation: { min: 1, integer: true },
    },
    {
      key: "after",
      label: "After (cursor)",
      type: "string",
      hint: "`endCursor` from the previous page.",
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers on this page" },
    { key: "hasNextPage", type: "boolean", label: "More pages exist" },
    { key: "endCursor", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const conn = await new BraintreeClient(ctx).field<{
      edges?: Array<{ node?: unknown } | null>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    }>(
      "customers",
      `query SearchCustomers($input: CustomerSearchInput!, $first: Int, $after: String) {
        customers(input: $input, first: $first, after: $after) {
          edges { node { ${CUSTOMER_FIELDS} } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {
        input: searchInput(input),
        first: input.first ?? 20,
        ...(input.after ? { after: input.after } : {}),
      },
    );
    return {
      customers: (conn.edges ?? []).map((e) => e?.node).filter(Boolean),
      hasNextPage: conn.pageInfo?.hasNextPage ?? false,
      endCursor: conn.pageInfo?.endCursor ?? null,
    };
  },
};

export default customerSearch;
