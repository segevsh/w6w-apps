import type { ActionDefinition } from "@w6w/types";
import { PAGE_OUTPUT, PAGE_PARAMS, RecurlyClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  order?: "asc" | "desc";
  ids?: string;
  next?: string;
  sort?: "created_at" | "updated_at";
  beginTime?: string;
  endTime?: string;
  type?: "authorization" | "capture" | "payment" | "purchase" | "refund" | "verify";
  success?: boolean;
}

/**
 * `GET /transactions` — list the site's payment-gateway transactions.
 *
 * `type=payment` is a documented umbrella that matches BOTH `purchase` and
 * `capture` transactions, not a third literal type of its own.
 */
const listTransactions: ActionDefinition<Input> = {
  key: "list-transactions",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description: "List a site's payment-gateway transactions.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    { key: "beginTime", label: "Begin time", type: "datetime" },
    { key: "endTime", label: "End time", type: "datetime" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "authorization", label: "Authorization" },
        { value: "capture", label: "Capture" },
        { value: "payment", label: "Payment (purchase or capture)" },
        { value: "purchase", label: "Purchase" },
        { value: "refund", label: "Refund" },
        { value: "verify", label: "Verify" },
      ],
    },
    {
      key: "success",
      label: "Successful only",
      type: "boolean",
      hint: 'Only `true` is meaningful — Recurly has no "failed only" literal for this filter.',
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(input.next ?? "/transactions", {
      query: input.next ? undefined : {
        limit: input.limit,
        order: input.order,
        ids: input.ids,
        sort: input.sort,
        begin_time: input.beginTime,
        end_time: input.endTime,
        type: input.type,
        success: input.success ? true : undefined,
      },
    });
  },
};

export default listTransactions;
