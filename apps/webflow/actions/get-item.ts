import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  itemId: string;
  cmsLocaleId?: string;
}

/** GET /collections/{collection_id}/items/{item_id} — fetch one CMS item. */
const getItem: ActionDefinition<Input> = {
  key: "get-item",
  type: "read",
  resource: "collection-item",
  title: "Get Collection Item",
  description: "Fetch a single item from a CMS collection.",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
    { key: "cmsLocaleId", label: "CMS locale ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "cmsLocaleId", type: "string", label: "CMS locale ID" },
    { key: "lastPublished", type: "string", label: "Last published" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "isArchived", type: "boolean", label: "Archived" },
    { key: "isDraft", type: "boolean", label: "Draft" },
    { key: "fieldData", type: "object", label: "Field data" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(
      `/collections/${encodeURIComponent(input.collectionId)}/items/${
        encodeURIComponent(input.itemId)
      }`,
      { query: { cmsLocaleId: input.cmsLocaleId } },
    );
  },
};

export default getItem;
