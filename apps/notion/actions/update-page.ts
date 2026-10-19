import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  filterProperties?: string[];
  properties?: Record<string, unknown>;
  icon?: unknown | null;
  cover?: unknown | null;
  isLocked?: boolean;
  template?: Record<string, unknown>;
  eraseContent?: boolean;
  notifications?: Record<string, unknown>;
  inTrash?: boolean;
  isArchived?: boolean;
}

/** PATCH /v1/pages/{page_id} — patch-page. */
const action: ActionDefinition<Input> = {
  key: "update-page",
  type: "perform",
  resource: "page",
  title: "Update Page",
  description: "Update page.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "is_archived", "type": "boolean", "label": "Is archived" },
    { "key": "is_locked", "type": "boolean", "label": "Is locked" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "public_url", "type": "object", "label": "Public url" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "properties", "type": "object", "label": "Properties" },
    { "key": "icon", "type": "object", "label": "Icon" },
    { "key": "cover", "type": "object", "label": "Cover" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
  ],
  idempotent: false,
  params: [
    {
      "key": "pageId",
      "label": "Page ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    {
      "key": "filterProperties",
      "label": "Filter Properties",
      "type": "array",
      "item": { "type": "string" },
      "hint":
        "Property names or IDs to include in each page's `properties` object. Other properties are left out. Repeat the parameter to pass more than one value, for example `filter_properties=title&filter_properties=Status`. Pages that aren't in a data source always return only `title`.",
    },
    { "key": "properties", "label": "Properties", "type": "json" },
    { "key": "icon", "label": "Icon", "type": "json" },
    { "key": "cover", "label": "Cover", "type": "json" },
    {
      "key": "isLocked",
      "label": "Is Locked",
      "type": "boolean",
      "hint":
        "Whether the page should be locked from editing in the Notion app UI. If not provided, the locked state will not be updated.",
    },
    { "key": "template", "label": "Template", "type": "json" },
    {
      "key": "eraseContent",
      "label": "Erase Content",
      "type": "boolean",
      "hint":
        "Whether to erase all existing content from the page. When used with a template, the template content replaces the existing content. When used without a template, simply clears the page content.",
    },
    {
      "key": "notifications",
      "label": "Notifications",
      "type": "json",
      "hint":
        'Controls the notifications Notion sends people about this change. Set mode to "silent" to skip page update notifications, @mention notifications, and notifications to people added to a Person property, or "default" to use the standard behavior. Database automations, reminders, and connection webhooks still work as usual. Page history, page activity, and workspace audit logs still record the change.',
    },
    { "key": "inTrash", "label": "In Trash", "type": "boolean" },
    { "key": "isArchived", "label": "Is Archived", "type": "boolean" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}`, {
      method: "PATCH",
      query: {
        "filter_properties": input.filterProperties,
      },
      body: {
        "properties": input.properties,
        "icon": input.icon,
        "cover": input.cover,
        "is_locked": input.isLocked,
        "template": input.template,
        "erase_content": input.eraseContent,
        "notifications": input.notifications,
        "in_trash": input.inTrash,
        "is_archived": input.isArchived,
      },
    });
  },
};

export default action;
