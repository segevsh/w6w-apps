import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  dataSourceId: string;
  title?: unknown[];
  icon?: unknown | null;
  properties?: Record<string, unknown>;
  inTrash?: boolean;
  parent?: Record<string, unknown>;
}

/** PATCH /v1/data_sources/{data_source_id} — update-a-data-source. */
const action: ActionDefinition<Input> = {
  key: "update-data-source",
  type: "perform",
  resource: "dataSource",
  title: "Update Data Source",
  description: "Update a data source.",
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
  params: [
    {
      "key": "dataSourceId",
      "label": "Data Source ID",
      "type": "string",
      "required": true,
      "hint": "ID of a Notion data source.",
    },
    {
      "key": "title",
      "label": "Title",
      "type": "json",
      "hint": "Title of data source as it appears in Notion.",
    },
    { "key": "icon", "label": "Icon", "type": "json", "hint": "Data source icon." },
    {
      "key": "properties",
      "label": "Properties",
      "type": "json",
      "hint":
        "The property schema of the data source. The keys are property names or IDs, and the values are property configuration objects. Properties set to null will be removed.",
    },
    {
      "key": "inTrash",
      "label": "In Trash",
      "type": "boolean",
      "hint":
        "Whether the data source should be moved to or from the trash. If not provided, the trash status will not be updated.",
    },
    {
      "key": "parent",
      "label": "Parent",
      "type": "json",
      "hint":
        "The parent of the data source, when moving it to a different database. If not provided, the parent will not be updated.",
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/data_sources/${pathId(input.dataSourceId)}`, {
      method: "PATCH",
      body: {
        "title": input.title,
        "icon": input.icon,
        "properties": input.properties,
        "in_trash": input.inTrash,
        "parent": input.parent,
      },
    });
  },
};

export default action;
