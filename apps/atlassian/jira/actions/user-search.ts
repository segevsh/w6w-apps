import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";

interface Input {
  query: string;
  maxResults?: number;
}

/**
 * The source of the `accountId` values the issue actions want. Atlassian
 * removed username and email from the API for privacy reasons, so account id
 * is the only stable way to refer to a person.
 */
const userSearch: ActionDefinition<Input, unknown[]> = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search Users",
  description:
    "Find users by name or email. Returns account ids — the only identifier Jira's API accepts.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Matched against display name and email.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [{ key: "", type: "array", label: "Users" }],

  execute(input, ctx) {
    return new JiraClient(ctx).request<unknown[]>("/user/search", {
      query: { query: input.query, maxResults: input.maxResults },
    });
  },
};

export default userSearch;
