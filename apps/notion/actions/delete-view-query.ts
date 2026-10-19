import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
  queryId: string;
}

/** DELETE /v1/views/{view_id}/queries/{query_id} — delete-view-query. */
const action: ActionDefinition<Input> = {
  key: "delete-view-query",
  type: "perform",
  resource: "view",
  title: "Delete View Query",
  description: "Delete a view query.",
  output: [{ "key": "object", "type": "string", "label": "Object" }, {
    "key": "id",
    "type": "string",
    "label": "Id",
  }, { "key": "deleted", "type": "boolean", "label": "Deleted" }],
  idempotent: false,
  params: [{
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the view.",
  }, {
    "key": "queryId",
    "label": "Query ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the query.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views/${pathId(input.viewId)}/queries/${pathId(input.queryId)}`, {
      method: "DELETE",
    });
  },
};

export default action;
