import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, jsonObject, str } from "../lib/client.ts";

/**
 * `POST /api/catalogs/{catalogName}/items` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "bulk-upsert-catalog-items",
  type: "perform",
  resource: "catalog",
  title: "Bulk Upsert Catalog Items",
  description:
    "Asynchronously create or update up to 1000 items. `documents` maps item id to its fields.",
  idempotent: true,
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'JSON object of {"<itemId>": {fields}}.',
    },
    {
      key: "replaceUploadedFieldsOnly",
      label: "Replace Uploaded Fields Only",
      type: "boolean",
      default: false,
      hint:
        "true updates only the supplied fields; false replaces the whole item. Defaults to false.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    const documents = jsonObject("documents", p.documents);
    const replaceUploadedFieldsOnly = bool(p.replaceUploadedFieldsOnly);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    if (documents === undefined) throw new Error("`documents` is required");
    ctx.log("info", "Iterable Bulk Upsert Catalog Items", { catalogName });
    const out = await call(
      ctx,
      "POST",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items`,
      {
        body: compact({
          "documents": documents,
          "replaceUploadedFieldsOnly": replaceUploadedFieldsOnly ?? false,
        }),
      },
    );
    return out;
  },
};

export default action;
