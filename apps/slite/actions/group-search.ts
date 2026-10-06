import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { cursorPageOutput, cursorParam } from "../lib/params.ts";

/** `GET /v1/groups` (operationId `searchGroups`) — `query` is required; cursor-paginated. */
interface Input {
  query: string;
  cursor?: string;
}

const groupSearch: ActionDefinition<Input> = {
  key: "group-search",
  type: "search",
  resource: "group",
  title: "Search Groups",
  description: "Search groups by name.",
  params: [
    { key: "query", label: "Query", type: "string", required: true, hint: "Matched against name." },
    cursorParam,
  ],
  output: cursorPageOutput("groups", "Groups"),

  execute(input, ctx) {
    const query = (input.query ?? "").trim();
    if (!query) throw new Error("query is required");
    return new SliteClient(ctx).get("/groups", { query, cursor: input.cursor });
  },
};

export default groupSearch;
