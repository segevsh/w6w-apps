import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, paginationParams, transactionTypeOptions } from "../lib/params.ts";

/**
 * `GET /transactions` — charges, rebills, refunds and cancellations across
 * the account. `transactionType`'s options come from the PHP SDK's own
 * `Api::$api_config['transactionTypes']`; the collection's query string only
 * shows the default (`any`).
 */
interface Input {
  page?: number;
  perPage?: number;
  query?: string;
  transactionType?: string;
  currency?: string;
  mode?: string;
}

const transactionSearch: ActionDefinition<Input> = {
  key: "transaction-search",
  type: "search",
  resource: "transaction",
  title: "Search Transactions",
  description: "Search transaction activity: charges, rebills, refunds and cancellations.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    {
      key: "transactionType",
      label: "Transaction type",
      type: "select",
      default: "any",
      options: transactionTypeOptions,
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "Optional 3-letter currency code (e.g. USD) to restrict results to.",
    },
    ...paginationParams(10),
    modeParam,
  ],
  output: [
    { key: "transactions", type: "array", label: "Transactions" },
    { key: "meta", type: "object", label: "Result count (total, results)" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get("/transactions", {
      query: {
        page: input.page,
        perPage: input.perPage,
        query: input.query,
        transactionType: input.transactionType,
        currency: input.currency,
      },
      mode: input.mode,
    });
  },
};

export default transactionSearch;
