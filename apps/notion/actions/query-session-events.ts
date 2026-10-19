import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  sessionId: string;
  filter?: Record<string, unknown>;
  sorts?: unknown[];
  startCursor?: string;
  pageSize?: number;
}

/** POST /v1/sessions/{session_id}/events/query — query-session-events. */
const action: ActionDefinition<Input> = {
  key: "query-session-events",
  type: "read",
  resource: "session",
  title: "Query Session Events",
  description: "Query session events.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "session_event", "type": "object", "label": "Session event" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{
    "key": "sessionId",
    "label": "Session ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the session whose events should be queried.",
  }, {
    "key": "filter",
    "label": "Filter",
    "type": "json",
    "hint":
      "A session event property filter, or an and/or compound filter nested up to three levels deep.",
  }, {
    "key": "sorts",
    "label": "Sorts",
    "type": "json",
    "hint": "Ordered sort precedence. Defaults to sequence ascending.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "The continuation cursor returned by the previous page.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "The number of events to return. Maximum: 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/sessions/${pathId(input.sessionId)}/events/query`, {
      method: "POST",
      body: {
        "filter": input.filter,
        "sorts": input.sorts,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
