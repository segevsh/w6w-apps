import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `GET /api/catalogs/{catalogName}/items/{itemId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-catalog-item",
  type: "read",
  resource: "catalog",
  title: "Get Catalog Item",
  description: "One catalog item.",
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
  ],
  output: [
    { key: "itemId", type: "string", label: "Item id" },
    { key: "value", type: "object", label: "Item fields" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    const itemId = str(p.itemId);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    if (itemId === undefined) throw new Error("`itemId` is required");
    ctx.log("info", "Iterable Get Catalog Item", { catalogName, itemId });
    const out = await call(
      ctx,
      "GET",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items/${
        encodeURIComponent(String(itemId))
      }`,
    );
    return out;
  },
};

export default action;
