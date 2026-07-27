import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  collectionId: string;
  limit?: number;
  offset?: number;
  cmsLocaleId?: string;
}

/**
 * GET /collections/{collection_id}/items — list items in a CMS collection. A
 * single page (Webflow caps `limit` at 100); walk `pagination.offset` for more.
 * The response is `{ items: [...], pagination: {...} }`.
 */
const listItems: ActionDefinition<Input> = {
  key: "list-items",
  type: "read",
  resource: "collection-item",
  title: "List Collection Items",
  description: "List items in a CMS collection (one page; max 100 per request).",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max 100.",
      validation: { min: 1, max: 100 },
    },
    { key: "offset", label: "Offset", type: "number", hint: "For pagination." },
    { key: "cmsLocaleId", label: "CMS locale ID", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Items" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/collections/${encodeURIComponent(input.collectionId)}/items`, {
      query: {
        limit: input.limit,
        offset: input.offset,
        cmsLocaleId: input.cmsLocaleId,
      },
    });
  },
};

export default listItems;
