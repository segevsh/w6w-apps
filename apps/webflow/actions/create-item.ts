import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
  isArchived?: boolean;
  cmsLocaleId?: string;
  live?: boolean;
}

/**
 * POST /collections/{collection_id}/items — create a CMS item. `fieldData` is
 * the map of collection field slug → value (`name` and `slug` are required by
 * Webflow for most collections). When `live` is set the item is created and
 * published to the live site via the `/items/live` variant; otherwise it stays
 * staged until a publish.
 */
const createItem: ActionDefinition<Input> = {
  key: "create-item",
  type: "perform",
  resource: "collection-item",
  title: "Create Collection Item",
  description: "Create an item in a CMS collection, optionally publishing it live.",
  idempotent: false,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "fieldData",
      label: "Field data",
      type: "json",
      required: true,
      hint: 'Object of field slug → value, e.g. `{ "name": "...", "slug": "..." }`.',
    },
    { key: "isDraft", label: "Draft", type: "boolean", default: false },
    { key: "isArchived", label: "Archived", type: "boolean", default: false },
    { key: "cmsLocaleId", label: "CMS locale ID", type: "string" },
    {
      key: "live",
      label: "Publish live",
      type: "boolean",
      default: false,
      hint: "Create and publish to the live site instead of staging.",
    },
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
    const body: Record<string, unknown> = { fieldData: input.fieldData };
    if (input.isDraft !== undefined) body.isDraft = input.isDraft;
    if (input.isArchived !== undefined) body.isArchived = input.isArchived;
    if (input.cmsLocaleId) body.cmsLocaleId = input.cmsLocaleId;
    const path = `/collections/${encodeURIComponent(input.collectionId)}/items${
      input.live ? "/live" : ""
    }`;
    return client.request(path, { method: "POST", body });
  },
};

export default createItem;
