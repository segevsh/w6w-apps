import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
  pageSize?: number;
}

/** POST /v1/views/{view_id}/queries — create-view-query. */
const action: ActionDefinition<Input> = {
  key: "create-view-query",
  type: "perform",
  resource: "view",
  title: "Create View Query",
  description: "Create a view query.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "view_id", "type": "string", "label": "View id" },
    { "key": "expires_at", "type": "string", "label": "Expires at" },
    { "key": "total_count", "type": "number", "label": "Total count" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  idempotent: false,
  params: [{
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the view.",
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
    return client.request(`/views/${pathId(input.viewId)}/queries`, {
      method: "POST",
      body: {
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
