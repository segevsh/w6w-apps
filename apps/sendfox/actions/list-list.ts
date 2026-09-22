import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /lists` — the account's contact lists.
 *
 * Each list carries its average open and click rates, which is what makes this
 * the call a workflow reads before choosing an audience. `query` is the only
 * documented parameter.
 */
interface Input {
  query?: string;
}

const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "search",
  resource: "list",
  title: "List Lists",
  description: "List the account's contact lists, with their average open and click rates.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Free-text search across the account's lists.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Lists" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total lists" },
    { key: "per_page", type: "number", label: "Lists per page" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/lists", { query: { query: input.query } });
  },
};

export default listList;
