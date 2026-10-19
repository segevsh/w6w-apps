import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  databaseId?: string;
  dataSourceId?: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/views — list-views. */
const action: ActionDefinition<Input> = {
  key: "list-views",
  type: "read",
  resource: "view",
  title: "List Views",
  description: "List views.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "view", "type": "object", "label": "View" },
    { "key": "request_status", "type": "object", "label": "Request status" },
  ],
  params: [{
    "key": "databaseId",
    "label": "Database ID",
    "type": "string",
    "hint":
      "ID of a Notion database (collection view block) to list views for. At least one of database_id or data_source_id is required.",
  }, {
    "key": "dataSourceId",
    "label": "Data Source ID",
    "type": "string",
    "hint":
      "ID of a data source (collection) to list all views for, including linked views across the workspace. At least one of database_id or data_source_id is required.",
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
    return client.request(`/views`, {
      method: "GET",
      query: {
        "database_id": input.databaseId,
        "data_source_id": input.dataSourceId,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
