import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  parent: Record<string, unknown>;
}

/** POST /v1/pages/{page_id}/move — move-page. */
const action: ActionDefinition<Input> = {
  key: "move-page",
  type: "perform",
  resource: "page",
  title: "Move Page",
  description: "Move a page.",
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
  params: [{
    "key": "pageId",
    "label": "Page ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the page to move.",
  }, {
    "key": "parent",
    "label": "Parent",
    "type": "json",
    "required": true,
    "hint": "The new parent of the page.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}/move`, {
      method: "POST",
      body: {
        "parent": input.parent,
      },
    });
  },
};

export default action;
