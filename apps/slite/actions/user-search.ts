import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { cursorPageOutput, cursorParam } from "../lib/params.ts";

/** `GET /v1/users` (operationId `searchUsers`) — `query` is required; cursor-paginated. */
interface Input {
  query: string;
  includeArchived?: boolean;
  cursor?: string;
}

const userSearch: ActionDefinition<Input> = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search Users",
  description: "Search users by email, display name or username.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Matched against email and display name.",
    },
    { key: "includeArchived", label: "Include archived", type: "boolean" },
    cursorParam,
  ],
  output: cursorPageOutput("users", "Users"),

  execute(input, ctx) {
    const query = (input.query ?? "").trim();
    if (!query) throw new Error("query is required");
    return new SliteClient(ctx).get("/users", {
      query,
      includeArchived: input.includeArchived,
      cursor: input.cursor,
    });
  },
};

export default userSearch;
