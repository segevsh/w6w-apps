import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  parent: unknown;
  title?: unknown[];
  description?: unknown[];
  isInline?: boolean;
  initialDataSource?: Record<string, unknown>;
  databaseType?: "tasks" | "projects" | "skills";
  icon?: Record<string, unknown>;
  cover?: Record<string, unknown>;
}

/** POST /v1/databases — create-database. */
const action: ActionDefinition<Input> = {
  key: "create-database",
  type: "perform",
  resource: "database",
  title: "Create Database",
  description: "Create a database.",
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
  idempotent: false,
  params: [
    {
      "key": "parent",
      "label": "Parent",
      "type": "json",
      "required": true,
      "hint": "The parent page or workspace where the database will be created.",
    },
    { "key": "title", "label": "Title", "type": "json", "hint": "The title of the database." },
    {
      "key": "description",
      "label": "Description",
      "type": "json",
      "hint": "The description of the database.",
    },
    {
      "key": "isInline",
      "label": "Is Inline",
      "type": "boolean",
      "hint":
        "Whether the database should be displayed inline in the parent page. Defaults to false.",
    },
    {
      "key": "initialDataSource",
      "label": "Initial Data Source",
      "type": "json",
      "hint": "Initial data source configuration for the database.",
    },
    {
      "key": "databaseType",
      "label": "Database Type",
      "type": "select",
      "options": [{ "value": "tasks", "label": "tasks" }, {
        "value": "projects",
        "label": "projects",
      }, { "value": "skills", "label": "skills" }],
      "hint":
        "Create a typed database with Notion's canonical schema. One of `tasks`, `projects`, or `skills`. Cannot be combined with `initial_data_source`. When `title` is omitted, the database is named after the type.",
    },
    { "key": "icon", "label": "Icon", "type": "json", "hint": "The icon for the database." },
    {
      "key": "cover",
      "label": "Cover",
      "type": "json",
      "hint": "The cover image for the database.",
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/databases`, {
      method: "POST",
      body: {
        "parent": input.parent,
        "title": input.title,
        "description": input.description,
        "is_inline": input.isInline,
        "initial_data_source": input.initialDataSource,
        "database_type": input.databaseType,
        "icon": input.icon,
        "cover": input.cover,
      },
    });
  },
};

export default action;
