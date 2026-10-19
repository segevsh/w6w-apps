import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  query?: string;
  filter?: unknown;
  sorts?: unknown[];
  startCursor?: string;
  pageSize?: number;
  verbose?: boolean;
  includeDeleted?: boolean;
}

/** POST /v1/agents/query — query-agents. */
const action: ActionDefinition<Input> = {
  key: "query-agents",
  type: "read",
  resource: "agent",
  title: "Query Agents",
  description: "Query agents.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
    "key": "query",
    "label": "Query",
    "type": "string",
    "hint": "Search agent names and descriptions using a case-insensitive substring match.",
  }, {
    "key": "filter",
    "label": "Filter",
    "type": "json",
    "hint": "Filter agents by public properties, optionally combined with and/or.",
  }, {
    "key": "sorts",
    "label": "Sorts",
    "type": "json",
    "hint": "Ordered sort precedence. Defaults to created_time descending.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "Opaque continuation cursor from the previous page.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "Number of agents to return. Maximum: 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }, {
    "key": "verbose",
    "label": "Verbose",
    "type": "boolean",
    "hint": "Whether to include inline instructions for each agent. Defaults to false.",
  }, {
    "key": "includeDeleted",
    "label": "Include Deleted",
    "type": "boolean",
    "hint": "Whether to include soft-deleted agents. Defaults to false.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/query`, {
      method: "POST",
      body: {
        "query": input.query,
        "filter": input.filter,
        "sorts": input.sorts,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
        "verbose": input.verbose,
        "include_deleted": input.includeDeleted,
      },
    });
  },
};

export default action;
