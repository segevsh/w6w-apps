import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  dataSourceId: string;
  name?: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/data_sources/{data_source_id}/templates — list-data-source-templates. */
const action: ActionDefinition<Input> = {
  key: "list-data-source-templates",
  type: "read",
  resource: "dataSource",
  title: "List Data Source Templates",
  description: "List templates in a data source.",
  output: [{ "key": "templates", "type": "array", "label": "Templates" }, {
    "key": "has_more",
    "type": "boolean",
    "label": "Has more",
  }, { "key": "next_cursor", "type": "object", "label": "Next cursor" }],
  params: [{
    "key": "dataSourceId",
    "label": "Data Source ID",
    "type": "string",
    "required": true,
    "hint": "ID of a Notion data source.",
  }, {
    "key": "name",
    "label": "Name",
    "type": "string",
    "hint": "Filter templates by name (case-insensitive substring match).",
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
    return client.request(`/data_sources/${pathId(input.dataSourceId)}/templates`, {
      method: "GET",
      query: {
        "name": input.name,
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
