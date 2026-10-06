import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `DELETE /api/catalogs/{catalogName}/items/{itemId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "delete-catalog-item",
  type: "perform",
  resource: "catalog",
  title: "Delete Catalog Item",
  description: "Asynchronously delete an item.",
  idempotent: true,
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
    { key: "itemId", label: "Item ID", type: "string", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    const itemId = str(p.itemId);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    if (itemId === undefined) throw new Error("`itemId` is required");
    ctx.log("info", "Iterable Delete Catalog Item", { catalogName, itemId });
    const out = await call(
      ctx,
      "DELETE",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items/${
        encodeURIComponent(String(itemId))
      }`,
    );
    return out;
  },
};

export default action;
