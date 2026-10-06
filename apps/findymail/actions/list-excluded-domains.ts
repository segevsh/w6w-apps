import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  query?: string;
  list_id?: number;
  per_page?: number;
  page?: number;
}

const listExcludedDomains: ActionDefinition<Input> = {
  key: "list-excluded-domains",
  type: "read",
  resource: "exclusion-list",
  title: "List Excluded Domains",
  description:
    "List excluded domains (paginated), optionally filtered to one exclusion list or a search string. Without a list ID it returns the global exclusion list.",
  params: [
    { "key": "query", "label": "Search", "type": "string" },
    { "key": "list_id", "label": "Exclusion list ID", "type": "number" },
    { "key": "per_page", "label": "Per page", "type": "number" },
    { "key": "page", "label": "Page", "type": "number" },
  ],
  output: [
    { "key": "data", "type": "array", "label": "Excluded domains" },
    { "key": "current_page", "type": "number", "label": "Page" },
    { "key": "per_page", "type": "number", "label": "Per page" },
    { "key": "total", "type": "number", "label": "Total" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/intellimatch/domains", {
      query: {
        query: input.query,
        list_id: input.list_id,
        per_page: input.per_page,
        page: input.page,
      },
    });
  },
};

export default listExcludedDomains;
