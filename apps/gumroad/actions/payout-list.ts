import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/payouts`
 * Needs the `view_payouts` or `account` scope.
 */
interface Input {
  after?: string;
  before?: string;
  includeUpcoming?: boolean;
  pageKey?: string;
}

const payoutList: ActionDefinition<Input> = {
  key: "payout-list",
  type: "read",
  resource: "payout",
  title: "List Payouts",
  description: "The seller's payouts, newest first. Needs the `view_payouts` or `account` scope.",
  params: [{ "key": "after", "label": "After", "type": "string", "hint": "YYYY-MM-DD." }, {
    "key": "before",
    "label": "Before",
    "type": "string",
    "hint": "YYYY-MM-DD.",
  }, {
    "key": "includeUpcoming",
    "label": "Include upcoming",
    "type": "boolean",
    "hint": "Gumroad's default is true.",
  }, {
    "key": "pageKey",
    "label": "Page key",
    "type": "string",
    "hint": "`nextPageKey` from the previous page. Leave empty for the first page.",
  }],
  output: [{ "key": "payouts", "type": "array", "label": "Payouts" }, {
    "key": "nextPageKey",
    "type": "string",
    "label": "Pass as Page key to fetch the next page; null on the last page",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/payouts`, {
      query: {
        after: input.after,
        before: input.before,
        include_upcoming: input.includeUpcoming,
        page_key: input.pageKey,
      },
    });
    return { payouts: body.payouts ?? [], nextPageKey: body.next_page_key ?? null };
  },
};

export default payoutList;
