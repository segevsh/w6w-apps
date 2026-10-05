import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
  email?: string;
  product_id?: string;
  transaction_type?: string;
  sort_by?: "date" | "earning" | "amount";
  sort_order?: "asc" | "desc";
  page_no?: number;
  page_size?: number;
}

const listTransactions: ActionDefinition<Input> = {
  key: "list-transactions",
  type: "search",
  title: "List Transactions",
  description:
    "List payments, refunds and chargebacks you earn a commission on, including joint-venture sales.",
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
    { key: "email", label: "Buyer email", type: "string" },
    {
      key: "product_id",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated product IDs.",
    },
    {
      key: "transaction_type",
      label: "Transaction types",
      type: "string",
      hint: "Comma separated, e.g. payment,refund,chargeback.",
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
    { key: "page_no", label: "Page number", type: "number", hint: "Starts at 1." },
    { key: "page_size", label: "Page size", type: "number", hint: "Items per page. Default 500." },
  ],
  output: [
    { key: "transaction_list", type: "array", label: "Transactions" },
    { key: "page_count", type: "number", label: "Total pages" },
    { key: "summary", type: "object", label: "Amounts and count" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listTransactions",
      compact({
        from: input.from,
        to: input.to,
        sort_by: input.sort_by,
        sort_order: input.sort_order,
        page_no: input.page_no,
        page_size: input.page_size,
        search: compact({
          email: input.email,
          product_id: input.product_id,
          transaction_type: input.transaction_type,
        }),
      }),
    );
  },
};

export default listTransactions;
