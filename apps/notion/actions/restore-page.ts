import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
}

/**
 * Undoes archive-page: PATCH `in_trash=false`. Notion doesn't ship a
 * dedicated "restore" endpoint — same route, opposite flag.
 */
const restorePage: ActionDefinition<Input> = {
  key: "restore-page",
  type: "perform",
  resource: "page",
  title: "Restore Page",
  description: "Restore a previously archived page.",
  idempotent: true,
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
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}`, {
      method: "PATCH",
      body: { in_trash: false },
    });
  },
};

export default restorePage;
