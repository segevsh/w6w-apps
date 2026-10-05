import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
  transaction_type?: string;
  commission_type?: string;
  purchase_id?: string;
  page_no?: number;
  page_size?: number;
}

const listCommissions: ActionDefinition<Input> = {
  key: "list-commissions",
  type: "search",
  title: "List Commissions",
  description: "List your commission amounts in a period.",
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
      key: "transaction_type",
      label: "Transaction types",
      type: "string",
      hint: "Comma separated. Default payment,refund,refund_request,chargeback.",
    },
    { key: "commission_type", label: "Commission type", type: "string", hint: "Default all." },
    { key: "purchase_id", label: "Purchase ID", type: "string" },
    { key: "page_no", label: "Page number", type: "number", hint: "Starts at 1." },
    { key: "page_size", label: "Page size", type: "number", hint: "Items per page. Default 0." },
  ],
  output: [
    { key: "items", type: "array", label: "Commissions" },
    { key: "item_count", type: "number", label: "Total commissions" },
    { key: "page_count", type: "number", label: "Total pages" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listCommissions",
      compact({
        from: input.from,
        to: input.to,
        transaction_type: input.transaction_type,
        commission_type: input.commission_type,
        purchase_id: input.purchase_id,
        page_no: input.page_no,
        page_size: input.page_size,
      }),
    );
  },
};

export default listCommissions;
