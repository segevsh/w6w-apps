import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  dataSourceId: string;
}

/** GET /v1/data_sources/{data_source_id} — retrieve-a-data-source. */
const action: ActionDefinition<Input> = {
  key: "get-data-source",
  type: "read",
  resource: "dataSource",
  title: "Get Data Source",
  description: "Retrieve a data source.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "properties", "type": "object", "label": "Properties" },
    { "key": "title", "type": "array", "label": "Title" },
    { "key": "description", "type": "array", "label": "Description" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "database_parent", "type": "object", "label": "Database parent" },
    { "key": "is_inline", "type": "boolean", "label": "Is inline" },
    { "key": "database_type", "type": "object", "label": "Database type" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "icon", "type": "object", "label": "Icon" },
    { "key": "cover", "type": "object", "label": "Cover" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "public_url", "type": "object", "label": "Public url" },
  ],
  params: [{
    "key": "dataSourceId",
    "label": "Data Source ID",
    "type": "string",
    "required": true,
    "hint": "ID of a Notion data source.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/data_sources/${pathId(input.dataSourceId)}`, {
      method: "GET",
    });
  },
};

export default action;
