import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
  queryId: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/views/{view_id}/queries/{query_id} — get-view-query-results. */
const action: ActionDefinition<Input> = {
  key: "get-view-query-results",
  type: "read",
  resource: "view",
  title: "Get View Query Results",
  description: "Get view query results.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "page", "type": "object", "label": "Page" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  params: [{
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the view.",
  }, {
    "key": "queryId",
    "label": "Query ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the query.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint":
      "If supplied, this endpoint will return a page of results starting after the cursor provided.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "The number of results to return per page. Maximum: 100 Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views/${pathId(input.viewId)}/queries/${pathId(input.queryId)}`, {
      method: "GET",
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
