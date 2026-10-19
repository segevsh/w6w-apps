import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  viewId: string;
}

/** GET /v1/views/{view_id} — retrieve-a-view. */
const action: ActionDefinition<Input> = {
  key: "get-view",
  type: "read",
  resource: "view",
  title: "Get View",
  description: "Retrieve a view.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "data_source_id", "type": "object", "label": "Data source id" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "filter", "type": "object", "label": "Filter" },
    { "key": "sorts", "type": "object", "label": "Sorts" },
    { "key": "quick_filters", "type": "object", "label": "Quick filters" },
    { "key": "configuration", "type": "object", "label": "Configuration" },
    { "key": "dashboard_view_id", "type": "string", "label": "Dashboard view id" },
  ],
  params: [{
    "key": "viewId",
    "label": "View ID",
    "type": "string",
    "required": true,
    "hint": "ID of a Notion view.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/views/${pathId(input.viewId)}`, {
      method: "GET",
    });
  },
};

export default action;
