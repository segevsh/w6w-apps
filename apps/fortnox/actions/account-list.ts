import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  sortBy?: string;
  lastModified?: string;
  sru?: string;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "List ledger accounts sorted by number.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
    {
      "key": "sortBy",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "number",
          "label": "number",
        },
      ],
    },
    {
      "key": "lastModified",
      "label": "Last modified since",
      "type": "string",
      "hint": "Only records changed since this timestamp, e.g. 2026-10-01 or 2026-10-01 08:00.",
    },
    {
      "key": "sru",
      "label": "SRU code",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "Accounts",
      "type": "array",
      "label": "Accounts",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/accounts", {
      page: input.page,
      limit: input.limit,
      sortby: input.sortBy,
      lastmodified: input.lastModified,
      sru: input.sru,
    });
  },
};

export default accountList;
