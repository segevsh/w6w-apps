import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

interface Input {
  query: string;
  page?: number;
}

const userSearch: ActionDefinition<Input> = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search Users",
  description: "Find users by email, name, phone or external id.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "jane@acme.test",
      hint: "An email, name fragment, phone number, or `external_id:…`.",
    },
    { key: "page", label: "Page", type: "number", validation: { min: 1, integer: true } },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Total matches" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/users/search.json", {
      query: { query: input.query, page: input.page },
    });
  },
};

export default userSearch;
