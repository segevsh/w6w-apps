import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /forms` — the account's subscription forms.
 *
 * `query` is the only documented parameter. Each `Form` carries its attached
 * `lists` and its public subscribe `url`.
 */
interface Input {
  query?: string;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List the account's subscription forms.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Free-text search across the account's forms.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Forms" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total forms" },
    { key: "per_page", type: "number", label: "Forms per page" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/forms", { query: { query: input.query } });
  },
};

export default formList;
