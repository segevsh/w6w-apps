import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
  role?: string;
  product_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  has_affiliate?: boolean;
  affiliate_name?: string;
  order_type?: "live" | "test";
  pay_method?: string;
  billing_type?: string;
  transaction_type?: string;
  currency?: string;
  search_purchase_id?: string;
  sort_by?: "date" | "earning" | "amount";
  sort_order?: "asc" | "desc";
  load_transactions?: boolean;
  page_no?: number;
  page_size?: number;
}

const listPurchases: ActionDefinition<Input> = {
  key: "list-purchases",
  type: "search",
  title: "List Purchases",
  description:
    "List your sales in a period, including those where you earn a commission (e.g. joint ventures). Filters mirror Digistore24's search criteria.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint:
        'Start of the period: "2014-02-28 23:11:24", an ISO 8601 time, or relative like "-3d", "-24h", "start". Defaults to the last 24 hours.',
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: 'End of the period, same formats as From. Defaults to "now".',
    },
    {
      key: "role",
      label: "Role",
      type: "string",
      hint: "vendor, affiliate or other — comma separated.",
    },
    {
      key: "product_id",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated product IDs.",
    },
    { key: "email", label: "Buyer email", type: "string" },
    { key: "first_name", label: "Buyer first name", type: "string" },
    { key: "last_name", label: "Buyer last name", type: "string" },
    { key: "has_affiliate", label: "Has affiliate", type: "boolean" },
    { key: "affiliate_name", label: "Affiliate name", type: "string" },
    {
      key: "order_type",
      label: "Order type",
      type: "select",
      options: [{ value: "live", label: "live" }, { value: "test", label: "test" }],
    },
    { key: "pay_method", label: "Payment methods", type: "string", hint: "Comma separated." },
    { key: "billing_type", label: "Billing types", type: "string", hint: "Comma separated." },
    {
      key: "transaction_type",
      label: "Transaction types",
      type: "string",
      hint: "Comma separated.",
    },
    { key: "currency", label: "Currency", type: "string" },
    {
      key: "search_purchase_id",
      label: "Purchase IDs",
      type: "string",
      hint: "Comma-separated purchase IDs to filter by.",
    },
    {
      key: "sort_by",
      label: "Sort by",
      type: "select",
      options: [{ value: "date", label: "date" }, { value: "earning", label: "earning" }, {
        value: "amount",
        label: "amount",
      }],
    },
    {
      key: "sort_order",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
    {
      key: "load_transactions",
      label: "Include transactions",
      type: "boolean",
      hint: "Attach each purchase's transaction list.",
    },
    { key: "page_no", label: "Page number", type: "number", hint: "Starts at 1." },
    { key: "page_size", label: "Page size", type: "number", hint: "Items per page. Default 500." },
  ],
  output: [
    { key: "purchase_list", type: "array", label: "Purchases" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listPurchases",
      compact({
        from: input.from,
        to: input.to,
        sort_by: input.sort_by,
        sort_order: input.sort_order,
        load_transactions: input.load_transactions,
        page_no: input.page_no,
        page_size: input.page_size,
        search: compact({
          role: input.role,
          product_id: input.product_id,
          email: input.email,
          first_name: input.first_name,
          last_name: input.last_name,
          has_affiliate: input.has_affiliate,
          affiliate_name: input.affiliate_name,
          order_type: input.order_type,
          pay_method: input.pay_method,
          billing_type: input.billing_type,
          transaction_type: input.transaction_type,
          currency: input.currency,
          purchase_id: input.search_purchase_id,
        }),
      }),
    );
  },
};

export default listPurchases;
