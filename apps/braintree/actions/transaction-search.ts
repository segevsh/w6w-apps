import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact, strList } from "../lib/client.ts";
import { TRANSACTION_SUMMARY } from "../lib/selections.ts";

interface Input {
  status?: unknown;
  createdFrom?: string;
  createdTo?: string;
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  merchantAccountId?: string;
  amountMin?: string;
  amountMax?: string;
  first?: number;
  after?: string;
}

const STATUSES = [
  "AUTHORIZATION_EXPIRED",
  "AUTHORIZED",
  "AUTHORIZING",
  "FAILED",
  "GATEWAY_REJECTED",
  "PROCESSOR_DECLINED",
  "SETTLED",
  "SETTLEMENT_CONFIRMED",
  "SETTLEMENT_DECLINED",
  "SETTLEMENT_PENDING",
  "SETTLING",
  "SUBMITTED_FOR_SETTLEMENT",
  "VOIDED",
];

/** Build `TransactionSearchInput` from the flat form fields; only set filters are sent. */
export function searchInput(input: Input): Record<string, unknown> {
  const statuses = strList(input.status);
  const created = compact({
    greaterThanOrEqualTo: input.createdFrom,
    lessThanOrEqualTo: input.createdTo,
  });
  const range = compact({
    greaterThanOrEqualTo: input.amountMin,
    lessThanOrEqualTo: input.amountMax,
  });
  const customer = compact({
    id: input.customerId ? { is: input.customerId } : undefined,
    email: input.customerEmail ? { is: input.customerEmail } : undefined,
  });
  return compact({
    status: statuses ? { in: statuses } : undefined,
    createdAt: Object.keys(created).length ? created : undefined,
    orderId: input.orderId ? { is: input.orderId } : undefined,
    customer: Object.keys(customer).length ? customer : undefined,
    merchantAccountId: input.merchantAccountId ? { is: input.merchantAccountId } : undefined,
    amount: Object.keys(range).length ? { value: range } : undefined,
  });
}

/** `transactions(input, first, after)` — a Relay connection. */
const transactionSearch: ActionDefinition<Input> = {
  key: "transaction-search",
  type: "search",
  resource: "transaction",
  title: "Search Transactions",
  description:
    "Search transactions by status, creation time, order ID, customer, merchant account and amount, one page at a time.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: STATUSES.map((s) => ({ value: s, label: s })),
    },
    {
      key: "createdFrom",
      label: "Created at or after",
      type: "datetime",
      hint: "ISO 8601 timestamp.",
    },
    { key: "createdTo", label: "Created at or before", type: "datetime" },
    { key: "orderId", label: "Order ID (exact)", type: "string" },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "customerEmail", label: "Customer email (exact)", type: "string" },
    { key: "merchantAccountId", label: "Merchant account ID", type: "string" },
    {
      key: "amountMin",
      label: "Minimum amount",
      type: "string",
      hint: "Decimal string, e.g. `10.00`.",
    },
    { key: "amountMax", label: "Maximum amount", type: "string" },
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
      hint: "`pageInfo.endCursor` from the previous page.",
    },
  ],
  output: [
    { key: "transactions", type: "array", label: "Transactions on this page" },
    { key: "hasNextPage", type: "boolean", label: "More pages exist" },
    { key: "endCursor", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const filters = searchInput(input);
    const conn = await new BraintreeClient(ctx).field<{
      edges?: Array<{ node?: unknown } | null>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    }>(
      "transactions",
      `query Search($input: TransactionSearchInput!, $first: Int, $after: String) {
        transactions(input: $input, first: $first, after: $after) {
          edges { node { ${TRANSACTION_SUMMARY} } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { input: filters, first: input.first ?? 20, ...(input.after ? { after: input.after } : {}) },
    );
    return {
      transactions: (conn.edges ?? []).map((e) => e?.node).filter(Boolean),
      hasNextPage: conn.pageInfo?.hasNextPage ?? false,
      endCursor: conn.pageInfo?.endCursor ?? null,
    };
  },
};

export default transactionSearch;
