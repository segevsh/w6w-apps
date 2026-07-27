import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  itemIds: string[];
}

/**
 * POST /collections/{collection_id}/items/publish — publish one or more staged
 * CMS items to the live site. The response is
 * `{ publishedItemIds: [...], errors: [...] }`.
 */
const publishItems: ActionDefinition<Input> = {
  key: "publish-items",
  type: "perform",
  resource: "collection-item",
  title: "Publish Collection Items",
  description: "Publish staged CMS items to the live site.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "itemIds",
      label: "Item IDs",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "IDs of the items to publish.",
    },
  ],
  output: [
    { key: "publishedItemIds", type: "array", label: "Published item IDs" },
    { key: "errors", type: "array", label: "Errors" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(
      `/collections/${encodeURIComponent(input.collectionId)}/items/publish`,
      { method: "POST", body: { itemIds: input.itemIds } },
    );
  },
};

export default publishItems;
