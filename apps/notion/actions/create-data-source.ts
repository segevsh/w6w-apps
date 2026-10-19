import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  parent: Record<string, unknown>;
  properties: Record<string, unknown>;
  title?: unknown[];
  icon?: unknown | null;
}

/** POST /v1/data_sources — create-a-database. */
const action: ActionDefinition<Input> = {
  key: "create-data-source",
  type: "perform",
  resource: "dataSource",
  title: "Create Data Source",
  description: "Create a data source.",
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
  idempotent: false,
  params: [{
    "key": "parent",
    "label": "Parent",
    "type": "json",
    "required": true,
    "hint": "An object specifying the parent of the new data source to be created.",
  }, {
    "key": "properties",
    "label": "Properties",
    "type": "json",
    "required": true,
    "hint": "Property schema of data source.",
  }, {
    "key": "title",
    "label": "Title",
    "type": "json",
    "hint": "Title of data source as it appears in Notion.",
  }, { "key": "icon", "label": "Icon", "type": "json", "hint": "Page icon." }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/data_sources`, {
      method: "POST",
      body: {
        "parent": input.parent,
        "properties": input.properties,
        "title": input.title,
        "icon": input.icon,
      },
    });
  },
};

export default action;
