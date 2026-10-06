import type { ActionDefinition } from "@w6w/types";
import { bool, call, int, str } from "../lib/client.ts";

/**
 * `GET /api/catalogs/{catalogName}/items` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-catalog-items",
  type: "read",
  resource: "catalog",
  title: "List Catalog Items",
  description: "Items in a catalog, paginated.",
  params: [
    { key: "catalogName", label: "Catalog Name", type: "string", required: true },
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    { key: "pageSize", label: "Page Size", type: "number", hint: "Results per page (default 10)." },
    {
      key: "orderBy",
      label: "Order By",
      type: "string",
      hint: "A field marked orderable in the catalog.",
    },
    { key: "sortAscending", label: "Sort Ascending", type: "boolean" },
  ],
  output: [
    { key: "catalogItemsWithProperties", type: "array", label: "Items" },
    { key: "totalItemsCount", type: "number", label: "Total items" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const catalogName = str(p.catalogName);
    const page = int("page", p.page);
    const pageSize = int("pageSize", p.pageSize);
    const orderBy = str(p.orderBy);
    const sortAscending = bool(p.sortAscending);
    if (catalogName === undefined) throw new Error("`catalogName` is required");
    ctx.log("info", "Iterable List Catalog Items", { catalogName });
    const out = await call(
      ctx,
      "GET",
      `/catalogs/${encodeURIComponent(String(catalogName))}/items`,
      {
        query: {
          "page": page,
          "pageSize": pageSize,
          "orderBy": orderBy,
          "sortAscending": sortAscending,
        },
      },
    );
    return out;
  },
};

export default action;
