import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  status?: "pending" | "uploaded" | "expired" | "failed";
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/file_uploads — list-file-uploads. */
const action: ActionDefinition<Input> = {
  key: "list-file-uploads",
  type: "read",
  resource: "fileUpload",
  title: "List File Uploads",
  description: "List file uploads.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "file_upload", "type": "object", "label": "File upload" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  params: [{
    "key": "status",
    "label": "Status",
    "type": "select",
    "options": [
      { "value": "pending", "label": "pending" },
      { "value": "uploaded", "label": "uploaded" },
      { "value": "expired", "label": "expired" },
      { "value": "failed", "label": "failed" },
    ],
    "hint": "If supplied, the endpoint will return file uploads with the specified status.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint":
      "If supplied, this endpoint will return a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "The number of items from the full list desired in the response. Maximum: 100 Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/file_uploads`, {
      method: "GET",
      query: {
        "status": input.status,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
