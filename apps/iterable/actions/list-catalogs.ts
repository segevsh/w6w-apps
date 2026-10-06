import type { ActionDefinition } from "@w6w/types";
import { call, int } from "../lib/client.ts";

/**
 * `GET /api/catalogs` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-catalogs",
  type: "read",
  resource: "catalog",
  title: "List Catalogs",
  description: "Catalog names, paginated.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    { key: "pageSize", label: "Page Size", type: "number", hint: "Results per page (default 10)." },
  ],
  output: [
    { key: "catalogNames", type: "array", label: "Catalog names" },
    { key: "totalCatalogsCount", type: "number", label: "Total catalogs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const page = int("page", p.page);
    const pageSize = int("pageSize", p.pageSize);
    ctx.log("info", "Iterable List Catalogs");
    const out = await call(ctx, "GET", "/catalogs", {
      query: { "page": page, "pageSize": pageSize },
    });
    return out;
  },
};

export default action;
