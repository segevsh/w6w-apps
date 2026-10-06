import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/deals/` — List or search deals. `query` matches deal name, company name and contact name; `statusId` filters by status (1 open, 2 expired, 3 won, 4 lost); created/modified and amount[gte]/[lte] filters go in `filters`.
 */
interface Input {
  query?: string;
  statusId?: string;
  page?: number;
  filters?: unknown;
}

const dealList: ActionDefinition<Input, unknown> = {
  key: "deal-list",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description:
    "List or search deals. `query` matches deal name, company name and contact name; `statusId` filters by status (1 open, 2 expired, 3 won, 4 lost); created/modified and amount[gte]/[lte] filters go in `filters`.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches deal name, company name and contact name.",
    },
    {
      key: "statusId",
      label: "Status",
      type: "select",
      options: [{ value: "1", label: "Open" }, { value: "2", label: "Expired" }, {
        value: "3",
        label: "Won",
      }, { value: "4", label: "Lost" }],
      hint: "1 open, 2 expired, 3 won, 4 lost.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "filters",
      label: "Extra filters",
      type: "json",
      hint:
        'Further query filters as a JSON object, e.g. {"created[gt]": "2024/01/01", "modified[lt]": "2024/02/01"}. Named parameters win on a clash.',
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/`, {
      method: "GET",
      query: {
        ...asObject(input.filters, "filters"),
        "query": input.query,
        "status_id": input.statusId,
        "page": input.page,
      },
    });
  },
};

export default dealList;
