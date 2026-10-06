import type { ActionDefinition } from "@w6w/types";
import { call, compact, jsonObject, str } from "../lib/client.ts";

/**
 * `PUT /api/catalogs/{catalogName}/items/{itemId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "replace-catalog-item",
  type: "perform",
  resource: "catalog",
  title: "Create or Replace Catalog Item",
  description: "Asynchronously create an item, or replace it entirely if it exists.",
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
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      hint: "The item's fields as a JSON object.",
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
    const value = jsonObject("value", p.value);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    if (itemId === undefined) throw new Error("`itemId` is required");
    if (value === undefined) throw new Error("`value` is required");
    ctx.log("info", "Iterable Create or Replace Catalog Item", { catalogName, itemId });
    const out = await call(
      ctx,
      "PUT",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items/${
        encodeURIComponent(String(itemId))
      }`,
      { body: compact({ "value": value }) },
    );
    return out;
  },
};

export default action;
