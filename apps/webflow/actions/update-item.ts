import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  itemId: string;
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
  isArchived?: boolean;
  cmsLocaleId?: string;
  live?: boolean;
}

/**
 * PATCH /collections/{collection_id}/items/{item_id} — update a CMS item's
 * fields. Only the slugs present in `fieldData` are changed. When `live` is set
 * the change is written straight to the published site via the `/live` variant.
 */
const updateItem: ActionDefinition<Input> = {
  key: "update-item",
  type: "perform",
  resource: "collection-item",
  title: "Update Collection Item",
  description: "Update fields on a CMS item, optionally publishing the change live.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
    {
      key: "fieldData",
      label: "Field data",
      type: "json",
      required: true,
      hint: "Object of field slug → value to change.",
    },
    { key: "isDraft", label: "Draft", type: "boolean" },
    { key: "isArchived", label: "Archived", type: "boolean" },
    { key: "cmsLocaleId", label: "CMS locale ID", type: "string" },
    {
      key: "live",
      label: "Publish live",
      type: "boolean",
      default: false,
      hint: "Write to the live site instead of staging.",
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
    const path = `/collections/${encodeURIComponent(input.collectionId)}/items/${
      encodeURIComponent(input.itemId)
    }${input.live ? "/live" : ""}`;
    return client.request(path, { method: "PATCH", body });
  },
};

export default updateItem;
