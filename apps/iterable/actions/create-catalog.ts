import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `POST /api/catalogs/{catalogName}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "create-catalog",
  type: "perform",
  resource: "catalog",
  title: "Create Catalog",
  description: "Create a catalog (name: letters, digits and dashes, 255 characters max).",
  idempotent: false,
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
    ctx.log("info", "Iterable Create Catalog", { catalogName });
    const out = await call(ctx, "POST", `/catalogs/${encodeURIComponent(String(catalogName))}`);
    return out;
  },
};

export default action;
