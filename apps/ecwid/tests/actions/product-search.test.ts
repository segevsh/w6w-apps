import { assert, assertEquals } from "@std/assert";
import productSearch from "../../actions/product-search.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-search: calls GET /products and returns the documented page", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ id: 692730761 }], { total: 42 }) }]);
  const out = await productSearch.execute({ limit: 50 }, ctx) as {
    items: unknown[];
    total: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.total, 42);
  assertEquals(out.items, [{ id: 692730761 }]);
});

Deno.test("product-search: the filters are passed through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await productSearch.execute(
    {
      keyword: "widget",
      sku: "W-1",
      category: "9691094",
      categories: "0,9691094",
      enabled: false,
      inStock: true,
      sortBy: "PRICE_ASC",
      offset: 100,
      responseFields: "total,items(id,name)",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    keyword: "widget",
    sku: "W-1",
    category: "9691094",
    categories: "0,9691094",
    // `enabled=false` means "only disabled products" in this API — it is a real
    // filter, not an absent flag.
    enabled: "false",
    inStock: "true",
    sortBy: "PRICE_ASC",
    offset: "100",
    responseFields: "total,items(id,name)",
  });
});

Deno.test("product-search: the prefilled limit stays below Ecwid's own maximum", () => {
  const limit = productSearch.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 50);
  assert(JSON.stringify(limit?.validation ?? {}).includes("100"), "no vendor maximum declared");
});
