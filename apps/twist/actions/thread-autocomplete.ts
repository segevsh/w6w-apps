import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/autocomplete/query_threads`
 *
 * Find threads whose title contains some text, across every channel the user can reach.
 */
interface Input {
  workspaceId: number;
  query: string;
  limit?: number;
}

const threadAutocomplete: ActionDefinition<Input> = {
  key: "thread-autocomplete",
  type: "search",
  resource: "search",
  title: "Find Threads by Title",
  description:
    "Find threads whose title contains some text, across every channel the user can reach.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    { key: "query", label: "Query", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", hint: "Twist default 10, maximum 50." },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/autocomplete/query_threads",
      params: { "workspace_id": input.workspaceId, "query": input.query, "limit": input.limit },
    });
  },
};

export default threadAutocomplete;
