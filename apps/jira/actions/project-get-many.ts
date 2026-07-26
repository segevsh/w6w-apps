import type { ActionDefinition } from "@w6w/types";
import { JiraClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  query?: string;
  maxResults?: number;
  startAt?: number;
}

const projectGetMany: ActionDefinition<Input> = {
  key: "project-get-many",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List the projects the connection can see — the source of project keys.",
  params: [
    { key: "query", label: "Query", type: "string", hint: "Filter by project name or key." },
    ...pagination,
  ],
  output: [
    { key: "values", type: "array", label: "Projects" },
    { key: "total", type: "number", label: "Total" },
    { key: "isLast", type: "boolean", label: "Last page" },
  ],

  execute(input, ctx) {
    return new JiraClient(ctx).request("/project/search", {
      query: {
        query: unset(input.query),
        maxResults: input.maxResults,
        startAt: input.startAt,
      },
    });
  },
};

export default projectGetMany;
