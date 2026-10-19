import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  databaseId: string;
}

/** GET /v1/databases/{database_id} — retrieve-database. */
const action: ActionDefinition<Input> = {
  key: "get-database",
  type: "read",
  resource: "database",
  title: "Get Database",
  description: "Retrieve a database.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "title", "type": "array", "label": "Title" },
    { "key": "description", "type": "array", "label": "Description" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "is_inline", "type": "boolean", "label": "Is inline" },
    { "key": "database_type", "type": "object", "label": "Database type" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "is_locked", "type": "boolean", "label": "Is locked" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "data_sources", "type": "array", "label": "Data sources" },
    { "key": "icon", "type": "object", "label": "Icon" },
    { "key": "cover", "type": "object", "label": "Cover" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "public_url", "type": "object", "label": "Public url" },
  ],
  params: [{
    "key": "databaseId",
    "label": "Database ID",
    "type": "string",
    "required": true,
    "hint": "ID of a Notion database, a container for one or more data sources.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/databases/${pathId(input.databaseId)}`, {
      method: "GET",
    });
  },
};

export default action;
