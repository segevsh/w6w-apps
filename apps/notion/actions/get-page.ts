import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  filterProperties?: string[];
}

/** GET /v1/pages/{page_id} — retrieve-a-page. */
const action: ActionDefinition<Input> = {
  key: "get-page",
  type: "read",
  resource: "page",
  title: "Get Page",
  description: "Retrieve a page.",
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
  params: [{
    "key": "pageId",
    "label": "Page ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the page to retrieve.",
  }, {
    "key": "filterProperties",
    "label": "Filter Properties",
    "type": "array",
    "item": { "type": "string" },
    "hint":
      "Property names or IDs to include in each page's `properties` object. Other properties are left out. Repeat the parameter to pass more than one value, for example `filter_properties=title&filter_properties=Status`. Pages that aren't in a data source always return only `title`.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}`, {
      method: "GET",
      query: {
        "filter_properties": input.filterProperties,
      },
    });
  },
};

export default action;
