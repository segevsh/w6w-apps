import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
}

/**
 * GET /collections/{collection_id} — fetch a collection's full detail,
 * including its `fields` schema (needed to build valid `fieldData` payloads).
 */
const getCollection: ActionDefinition<Input> = {
  key: "get-collection",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch a CMS collection, including its field schema.",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "singularName", type: "string", label: "Singular name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
    { key: "fields", type: "array", label: "Fields" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/collections/${encodeURIComponent(input.collectionId)}`);
  },
};

export default getCollection;
