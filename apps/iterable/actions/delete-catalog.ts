import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `DELETE /api/catalogs/{catalogName}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "delete-catalog",
  type: "perform",
  resource: "catalog",
  title: "Delete Catalog",
  description: "Delete a catalog and every collection that references it.",
  idempotent: true,
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    ctx.log("info", "Iterable Delete Catalog", { catalogName });
    const out = await call(ctx, "DELETE", `/catalogs/${encodeURIComponent(String(catalogName))}`);
    return out;
  },
};

export default action;
