import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  personId?: number;
  sentiment?: string;
  disposition?: string;
  perPage?: number;
  page?: number;
}

/** GET /v2/activities/calls — list/filter logged calls. */
const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description: "List and filter logged calls.",
  params: [
    { key: "personId", label: "Person ID", type: "number" },
    { key: "sentiment", label: "Sentiment", type: "string" },
    { key: "disposition", label: "Disposition", type: "string" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      advanced: true,
      hint: "Salesloft's own sort key for this list; omit for its default.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Calls" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/activities/calls", {
      query: compact({
        person_id: input.personId,
        sentiment: input.sentiment,
        disposition: input.disposition,
        per_page: input.perPage,
        page: input.page,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default callList;
