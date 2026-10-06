import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/transactions` — List payment transactions with filters.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id?: number;
  synced?: string;
  search?: string;
  source?: string;
  timeFrom?: string;
  timeTo?: string;
  page?: number;
  limit?: number;
  sort?: string;
  sortByAmount?: string;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "read",
  resource: "transaction",
  title: "List transactions",
  description: "List payment transactions with filters.",
  params: [
    {
      key: "id",
      label: "Transaction ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "synced",
      label: "Synced to a deal",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Name, email, phone or value.",
    },
    {
      key: "source",
      label: "Sources",
      type: "string",
      hint: "Zapier, Stripe, Make or Other; comma-separated for several.",
    },
    {
      key: "timeFrom",
      label: "Created from",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "timeTo",
      label: "Created to",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page.",
    },
    {
      key: "sort",
      label: "Sort by creation time",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "sortByAmount",
      label: "Sort by amount",
      type: "select",
      options: [{ value: "ascAmount", label: "Amount ascending" }, {
        value: "descAmount",
        label: "Amount descending",
      }],
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total transactions" },
    { key: "data", type: "array", label: "Transactions" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/transactions", {
      query: {
        id: input.id,
        synced: input.synced,
        search: input.search,
        source: input.source,
        timeFrom: input.timeFrom,
        timeTo: input.timeTo,
        page: input.page,
        limit: input.limit,
        sort: input.sort,
        sortByAmount: input.sortByAmount,
      },
    });
  },
};

export default transactionList;
