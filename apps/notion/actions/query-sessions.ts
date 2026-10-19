import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  query?: string;
  filter?: Record<string, unknown>;
  sorts?: unknown[];
  startCursor?: string;
  pageSize?: number;
}

/** POST /v1/sessions/query — query-sessions. */
const action: ActionDefinition<Input> = {
  key: "query-sessions",
  type: "read",
  resource: "session",
  title: "Query Sessions",
  description: "Query sessions.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "session", "type": "object", "label": "Session" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
    "key": "query",
    "label": "Query",
    "type": "string",
    "hint": "A case-insensitive substring search over session titles.",
  }, {
    "key": "filter",
    "label": "Filter",
    "type": "json",
    "hint": "A session property filter, or an and/or compound filter nested up to two levels deep.",
  }, {
    "key": "sorts",
    "label": "Sorts",
    "type": "json",
    "hint": "Ordered sort precedence. Defaults to updated_at descending.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "The continuation cursor returned by the previous page.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "The number of sessions to return. Maximum: 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/sessions/query`, {
      method: "POST",
      body: {
        "query": input.query,
        "filter": input.filter,
        "sorts": input.sorts,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
