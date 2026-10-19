import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  propertyId: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/pages/{page_id}/properties/{property_id} — retrieve-a-page-property. */
const action: ActionDefinition<Input> = {
  key: "get-page-property",
  type: "read",
  resource: "page",
  title: "Get Page Property",
  description: "Retrieve a page property item.",
  output: [
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "number", "type": "number", "label": "Number" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "url", "type": "string", "label": "Url" },
    { "key": "select", "type": "object", "label": "Select" },
    { "key": "multi_select", "type": "array", "label": "Multi select" },
    { "key": "status", "type": "object", "label": "Status" },
    { "key": "date", "type": "object", "label": "Date" },
    { "key": "email", "type": "string", "label": "Email" },
    { "key": "phone_number", "type": "string", "label": "Phone number" },
    { "key": "checkbox", "type": "boolean", "label": "Checkbox" },
    { "key": "files", "type": "array", "label": "Files" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "formula", "type": "object", "label": "Formula" },
    { "key": "button", "type": "object", "label": "Button" },
    { "key": "unique_id", "type": "object", "label": "Unique id" },
    { "key": "verification", "type": "object", "label": "Verification" },
    { "key": "place", "type": "object", "label": "Place" },
    { "key": "title", "type": "object", "label": "Title" },
    { "key": "rich_text", "type": "object", "label": "Rich text" },
    { "key": "people", "type": "object", "label": "People" },
    { "key": "relation", "type": "object", "label": "Relation" },
    { "key": "rollup", "type": "object", "label": "Rollup" },
    { "key": "property_item", "type": "object", "label": "Property item" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
  ],
  params: [
    {
      "key": "pageId",
      "label": "Page ID",
      "type": "string",
      "required": true,
      "hint": "The ID of the page containing the property.",
    },
    {
      "key": "propertyId",
      "label": "Property ID",
      "type": "string",
      "required": true,
      "hint": "The ID or name of the property to retrieve.",
    },
    { "key": "startCursor", "label": "Start Cursor", "type": "string" },
    {
      "key": "pageSize",
      "label": "Page Size",
      "type": "number",
      "hint": "Number of results per page (1–100).",
      "validation": { "integer": true, "min": 1, "max": 100 },
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}/properties/${pathId(input.propertyId)}`, {
      method: "GET",
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
