import type { ActionDefinition } from "@w6w/types";
import { call, compact, jsonObject, str } from "../lib/client.ts";

/**
 * `PATCH /api/catalogs/{catalogName}/items/{itemId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "update-catalog-item",
  type: "perform",
  resource: "catalog",
  title: "Create or Update Catalog Item",
  description: "Asynchronously create an item, or update only the supplied fields if it exists.",
  idempotent: true,
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      required: true,
      hint: "Letters, digits and dashes, 255 characters max.",
    },
    {
      key: "update",
      label: "Update",
      type: "json",
      required: true,
      hint: "The fields to set, as a JSON object.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    const itemId = str(p.itemId);
    const update = jsonObject("update", p.update);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    if (itemId === undefined) throw new Error("`itemId` is required");
    if (update === undefined) throw new Error("`update` is required");
    ctx.log("info", "Iterable Create or Update Catalog Item", { catalogName, itemId });
    const out = await call(
      ctx,
      "PATCH",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items/${
        encodeURIComponent(String(itemId))
      }`,
      { body: compact({ "update": update }) },
    );
    return out;
  },
};

export default action;
