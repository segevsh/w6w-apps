import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  databaseId: string;
  parent?: unknown;
  title?: unknown[];
  description?: unknown[];
  isInline?: boolean;
  icon?: Record<string, unknown>;
  cover?: Record<string, unknown>;
  inTrash?: boolean;
  isLocked?: boolean;
}

/** PATCH /v1/databases/{database_id} — update-database. */
const action: ActionDefinition<Input> = {
  key: "update-database",
  type: "perform",
  resource: "database",
  title: "Update Database",
  description: "Update a database.",
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
  params: [{
    "key": "databaseId",
    "label": "Database ID",
    "type": "string",
    "required": true,
    "hint": "ID of a Notion database, a container for one or more data sources.",
  }, {
    "key": "parent",
    "label": "Parent",
    "type": "json",
    "hint":
      "The parent page or workspace to move the database to. If not provided, the database will not be moved.",
  }, {
    "key": "title",
    "label": "Title",
    "type": "json",
    "hint":
      "The updated title of the database, if any. If not provided, the title will not be updated.",
  }, {
    "key": "description",
    "label": "Description",
    "type": "json",
    "hint":
      "The updated description of the database, if any. If not provided, the description will not be updated.",
  }, {
    "key": "isInline",
    "label": "Is Inline",
    "type": "boolean",
    "hint":
      "Whether the database should be displayed inline in the parent page. If not provided, the inline status will not be updated.",
  }, {
    "key": "icon",
    "label": "Icon",
    "type": "json",
    "hint":
      "The updated icon for the database, if any. If not provided, the icon will not be updated.",
  }, {
    "key": "cover",
    "label": "Cover",
    "type": "json",
    "hint":
      "The updated cover image for the database, if any. If not provided, the cover will not be updated.",
  }, {
    "key": "inTrash",
    "label": "In Trash",
    "type": "boolean",
    "hint":
      "Whether the database should be moved to or from the trash. If not provided, the trash status will not be updated.",
  }, {
    "key": "isLocked",
    "label": "Is Locked",
    "type": "boolean",
    "hint":
      "Whether the database should be locked from editing in the Notion app UI. If not provided, the locked state will not be updated.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/databases/${pathId(input.databaseId)}`, {
      method: "PATCH",
      body: {
        "parent": input.parent,
        "title": input.title,
        "description": input.description,
        "is_inline": input.isInline,
        "icon": input.icon,
        "cover": input.cover,
        "in_trash": input.inTrash,
        "is_locked": input.isLocked,
      },
    });
  },
};

export default action;
