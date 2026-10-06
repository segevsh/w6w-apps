import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /tasks/search` — Search tasks across all projects.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  query?: string;
  limit?: number;
  searchInClosed?: boolean;
}

const taskSearch: ActionDefinition<Input> = {
  key: "task-search",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description: "Search tasks across all projects.",
  params: [
    { key: "query", label: "Search text", type: "string", hint: "Task name search." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      hint: "Max results (vendor example: 10).",
    },
    { key: "searchInClosed", label: "Search closed tasks", type: "boolean" },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/tasks/search`, {
      query: { "query": input.query, "limit": input.limit, "searchInClosed": input.searchInClosed },
    });
  },
};

export default taskSearch;
