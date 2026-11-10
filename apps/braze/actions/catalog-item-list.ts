import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `GET /catalogs/{catalog_name}/items` — verified against the fetched spec.
 * The community spec declares no query parameters for this operation (no `limit`,
 * `offset`, or cursor), so none are exposed here. The vendor page documents 50 items
 * per call and a `Link`-header cursor, which `BrazeClient.get` does not surface.
 */
const action: ActionDefinition = {
  key: "catalog-item-list",
  type: "read",
  resource: "catalog",
  title: "List Catalog Items",
  description: "List every item in a catalog.",
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Items" },
  ],

  async execute(input, ctx) {
    const p = input as { catalogName: string };
    return await new BrazeClient(ctx).get(`/catalogs/${encodeURIComponent(p.catalogName)}/items`);
  },
};

export default action;
