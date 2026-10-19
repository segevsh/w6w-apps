import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
}

/** DELETE /v1/views/{view_id} — delete-view. */
const action: ActionDefinition<Input> = {
  key: "delete-view",
  type: "perform",
  resource: "view",
  title: "Delete View",
  description: "Delete a view.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "type", "type": "string", "label": "Type" },
  ],
  idempotent: false,
  params: [{
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the view to delete.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views/${pathId(input.viewId)}`, {
      method: "DELETE",
    });
  },
};

export default action;
